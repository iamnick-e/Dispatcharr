# Multi-Account Pooling - Technical Analysis

**Created:** 2026-02-28  
**Repository:** ~/.openclaw/workspace/Dispatcharr (forked from Dispatcharr/Dispatcharr)

## Architecture Overview

**Tech Stack:**
- Backend: Django (Python)
- Database: Models via Django ORM
- API: Xtream Codes client (`core/xtream_codes.py`)
- Stream Proxy: `apps/proxy/`
- Connection Management: `apps/proxy/vod_proxy/connection_manager.py`

## Current M3U Account Model

**File:** `apps/m3u/models.py`

### M3UAccount Model (Current)

```python
class M3UAccount(models.Model):
    name = models.CharField(max_length=255, unique=True)
    server_url = models.URLField(max_length=1000, blank=True, null=True)
    account_type = models.CharField(choices=Types.choices, default=Types.STADNARD)
    
    # Xtream Codes specific
    username = models.CharField(max_length=255, null=True, blank=True)
    password = models.CharField(max_length=255, null=True, blank=True)
    
    # Stream management
    max_streams = models.PositiveIntegerField(default=0)  # 0 = unlimited
    is_active = models.BooleanField(default=True)
    
    # Metadata
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IDLE)
    stream_profile = models.ForeignKey(StreamProfile, ...)
    priority = models.PositiveIntegerField(default=0)  # For VOD selection
```

**Key Observations:**
1. ✅ Each account is independent (separate username/password)
2. ✅ `max_streams` already exists (but not enforced for pooling)
3. ✅ `priority` field exists for VOD provider selection
4. ❌ No concept of "account groups" or "pool membership"
5. ❌ No active stream tracking per account

## Xtream Codes Client

**File:** `core/xtream_codes.py`

### Client Class (Current)

```python
class Client:
    def __init__(self, server_url, username, password, user_agent=None):
        self.server_url = self._normalize_url(server_url)
        self.username = username
        self.password = password
        self.session = requests.Session()  # Persistent session
        
    def authenticate(self):
        """Authenticate and validate server response"""
        endpoint = "player_api.php"
        params = {'username': self.username, 'password': self.password}
        self.server_info = self._make_request(endpoint, params)
        return self.server_info
```

**Key Observations:**
1. ✅ Each client instance = one account connection
2. ✅ Persistent session via `requests.Session()`
3. ✅ Authentication separate from stream requests
4. ❌ No awareness of other accounts from same provider

## Connection Management

**File:** `apps/proxy/vod_proxy/connection_manager.py`

This manages active connections/streams. Need to review how it tracks concurrent streams.

## Proposed Implementation

### Phase 1: Data Model Changes

**1. Add AccountPool Model**

```python
class AccountPool(models.Model):
    """Group multiple M3U accounts from same provider for pooling"""
    name = models.CharField(max_length=255, unique=True)
    provider_name = models.CharField(max_length=255)  # e.g., "MyIPTV Provider"
    pooling_enabled = models.BooleanField(default=True)
    strategy = models.CharField(
        max_length=20,
        choices=[
            ('round_robin', 'Round Robin'),
            ('least_used', 'Least Used'),
            ('random', 'Random')
        ],
        default='round_robin'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Account Pool"
        verbose_name_plural = "Account Pools"
```

**2. Link M3UAccount to AccountPool**

```python
# Add to M3UAccount model
pool = models.ForeignKey(
    AccountPool,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='accounts',
    help_text="Pool this account belongs to for multi-account streaming"
)
```

**3. Add StreamAssignment Model (Track Active Streams)**

```python
class StreamAssignment(models.Model):
    """Track which account is serving which stream"""
    account = models.ForeignKey(M3UAccount, on_delete=models.CASCADE)
    channel_id = models.CharField(max_length=255)
    client_ip = models.GenericIPAddressField()
    started_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['account', 'started_at']),
        ]
```

### Phase 2: Pool Manager Service

**File:** `core/account_pool_manager.py` (NEW)

```python
class AccountPoolManager:
    """Manages account selection from pools"""
    
    def get_available_account(self, pool_id, channel_id):
        """
        Find available account from pool
        
        Returns:
            M3UAccount instance or None if all busy
        """
        pool = AccountPool.objects.get(id=pool_id)
        accounts = pool.accounts.filter(is_active=True)
        
        for account in self._sort_by_strategy(accounts, pool.strategy):
            active_streams = StreamAssignment.objects.filter(
                account=account,
                last_activity__gte=timezone.now() - timedelta(minutes=5)
            ).count()
            
            if account.max_streams == 0 or active_streams < account.max_streams:
                return account
        
        return None  # All accounts busy
    
    def assign_stream(self, account, channel_id, client_ip):
        """Record stream assignment"""
        return StreamAssignment.objects.create(
            account=account,
            channel_id=channel_id,
            client_ip=client_ip
        )
    
    def release_stream(self, channel_id, client_ip):
        """Release stream back to pool"""
        StreamAssignment.objects.filter(
            channel_id=channel_id,
            client_ip=client_ip
        ).delete()
    
    def _sort_by_strategy(self, accounts, strategy):
        """Sort accounts based on strategy"""
        if strategy == 'least_used':
            # Annotate with active stream count
            from django.db.models import Count
            return accounts.annotate(
                stream_count=Count('streamassignment')
            ).order_by('stream_count')
        elif strategy == 'random':
            import random
            return sorted(accounts, key=lambda x: random.random())
        else:  # round_robin (default)
            return accounts.order_by('id')
```

### Phase 3: Proxy Integration

**Modify:** `apps/proxy/` stream handlers

**Before (current):**
```python
def handle_stream_request(channel_id):
    account = get_account_for_channel(channel_id)
    return proxy_stream(account, channel_id)
```

**After (pooled):**
```python
def handle_stream_request(channel_id, client_ip):
    channel = Channel.objects.get(id=channel_id)
    account = channel.m3u_account
    
    # Check if account belongs to a pool
    if account.pool and account.pool.pooling_enabled:
        pool_manager = AccountPoolManager()
        selected_account = pool_manager.get_available_account(
            account.pool.id, 
            channel_id
        )
        
        if not selected_account:
            return HttpResponse("No available tuners", status=503)
        
        # Assign stream
        assignment = pool_manager.assign_stream(
            selected_account, 
            channel_id, 
            client_ip
        )
        
        return proxy_stream(selected_account, channel_id, assignment)
    else:
        # Single account mode (existing behavior)
        return proxy_stream(account, channel_id)
```

### Phase 4: Plex Tuner Integration

**Current:** Dispatcharr presents via HDHomeRun emulation  
**Enhancement:** Each pooled account = separate virtual tuner

**File:** `apps/hdhr/` (HDHomeRun emulation)

```python
def get_tuner_count():
    """Return number of tuners available"""
    # For non-pooled accounts: 1 tuner per account
    # For pooled accounts: sum of all accounts in pool
    
    total_tuners = 0
    
    # Standard accounts
    total_tuners += M3UAccount.objects.filter(
        is_active=True,
        pool__isnull=True
    ).count()
    
    # Pooled accounts
    for pool in AccountPool.objects.filter(pooling_enabled=True):
        total_tuners += pool.accounts.filter(is_active=True).count()
    
    return total_tuners
```

## File Structure

```
apps/
├── m3u/
│   ├── models.py              # Add: AccountPool, pool FK, StreamAssignment
│   ├── migrations/            # Django migrations for new models
│   └── admin.py               # Add pool management UI
├── proxy/
│   └── stream_handler.py      # Modify: Add pool-aware routing
├── hdhr/
│   └── discovery.py           # Modify: Report pooled tuner count
core/
└── account_pool_manager.py    # NEW: Pool management logic
```

## Migration Strategy

### Step 1: Add Models (Non-Breaking)
- Add `AccountPool` model
- Add `pool` FK to `M3UAccount` (nullable)
- Add `StreamAssignment` model
- Run migrations

### Step 2: Create Pool Manager (Isolated)
- Implement `AccountPoolManager` class
- Unit tests for pool logic
- No integration yet

### Step 3: Optional Pool Usage (Feature Flag)
- Add setting: `ENABLE_ACCOUNT_POOLING`
- Modify proxy to check pool membership
- Fallback to existing behavior if disabled

### Step 4: Admin UI
- Add pool creation/management
- Assign accounts to pools
- View active stream assignments

### Step 5: Testing
- Create 3 test accounts (same provider)
- Add to pool
- Verify concurrent streams work
- Test failover on disconnect

## Configuration Example

**Admin UI Flow:**

1. Create 3 Xtream accounts (same provider)
   - Account 1: myiptv_account1 / pass1
   - Account 2: myiptv_account2 / pass2  
   - Account 3: myiptv_account3 / pass3

2. Create AccountPool
   - Name: "MyIPTV Pool"
   - Provider: "MyIPTV"
   - Strategy: "Least Used"
   - Enabled: True

3. Assign accounts to pool
   - Account 1 → MyIPTV Pool
   - Account 2 → MyIPTV Pool
   - Account 3 → MyIPTV Pool

4. Plex sees 3 tuners
   - Tuner 1 (Account 1)
   - Tuner 2 (Account 2)
   - Tuner 3 (Account 3)

5. Stream routing
   - Channel request → Pool manager selects available account
   - Stream assignment tracked
   - Automatic failover if account disconnects

## Next Steps

1. ✅ Codebase explored
2. ⏭️ Create feature branch: `feature/multi-account-pooling`
3. ⏭️ Implement Phase 1 (data models)
4. ⏭️ Write pool manager logic
5. ⏭️ Integrate with proxy
6. ⏭️ Test with real accounts

## Notes

- **Backward compatible:** Existing single-account setups unaffected
- **Optional feature:** Only active when pool is configured
- **Database-driven:** All logic uses Django ORM (no hardcoded state)
- **Failover bonus:** Solves Reddit's "random disconnect" bug via redundancy
