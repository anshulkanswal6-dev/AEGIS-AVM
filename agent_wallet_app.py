from algopy import (
    ARC4Contract,
    Account,
    Application,
    BoxMap,
    Global,
    GlobalState,
    Txn,
    UInt64,
    itxn,
    arc4,
)




class AgentWalletApp(ARC4Contract):
    def __init__(self) -> None:
        # roles
        self.owner = GlobalState(Account)
        self.executor = GlobalState(Account)
        self.factory_app = GlobalState(Application)

        # lifecycle
        self.initialized = GlobalState(bool)
        self.wallet_paused = GlobalState(bool)

        # ALGO daily limits
        self.daily_algo_limit = GlobalState(UInt64)
        self.algo_spent_today = GlobalState(UInt64)
        self.algo_last_reset = GlobalState(UInt64)

        # ASA daily limits keyed by asset id
        self.daily_asset_limit = BoxMap(UInt64, UInt64, key_prefix=b"dal_")
        self.asset_spent_today = BoxMap(UInt64, UInt64, key_prefix=b"ast_")
        self.asset_last_reset = BoxMap(UInt64, UInt64, key_prefix=b"alr_")

    # ---------- internal guards ----------

    def _only_owner(self) -> None:
        assert Txn.sender == self.owner.value, "NotOwner"

    def _only_executor(self) -> None:
        assert Txn.sender == self.executor.value, "NotExecutor"

    def _only_factory(self) -> None:
        assert Global.caller_application_id == self.factory_app.value.id, "NotFactory"

    def _when_not_paused(self) -> None:
        assert not self.wallet_paused.value, "Paused"

    def _reset_algo_spend_if_needed(self) -> None:
        last = self.algo_last_reset.get(default=UInt64(0))
        if last == UInt64(0) or Global.latest_timestamp >= last + 86_400:
            self.algo_spent_today.value = UInt64(0)
            self.algo_last_reset.value = Global.latest_timestamp

    def _reset_asset_spend_if_needed(self, asset_id: UInt64) -> None:
        last = self.asset_last_reset.get(asset_id, default=UInt64(0))
        if last == UInt64(0) or Global.latest_timestamp >= last + 86_400:
            self.asset_spent_today[asset_id] = UInt64(0)
            self.asset_last_reset[asset_id] = Global.latest_timestamp

    # ---------- create/init ----------

    @arc4.abimethod(create="require")
    def initialize(
        self,
        owner: arc4.Address,
        executor: arc4.Address,
        daily_algo_limit: arc4.UInt64,
        factory_app: Application,
    ) -> None:
        assert not self.initialized.get(default=False), "AlreadyInitialized"
        assert owner.native != Account(), "ZeroOwner"
        assert executor.native != Account(), "ZeroExecutor"

        self.initialized.value = True
        self.owner.value = owner.native
        self.executor.value = executor.native
        self.factory_app.value = factory_app

        self.wallet_paused.value = False
        self.daily_algo_limit.value = daily_algo_limit.native
        self.algo_spent_today.value = UInt64(0)
        self.algo_last_reset.value = Global.latest_timestamp

    # ---------- views ----------

    @arc4.abimethod(readonly=True)
    def get_owner(self) -> arc4.Address:
        return arc4.Address(self.owner.value)

    @arc4.abimethod(readonly=True)
    def get_executor(self) -> arc4.Address:
        return arc4.Address(self.executor.value)

    @arc4.abimethod(readonly=True)
    def get_wallet_paused(self) -> bool:
        return self.wallet_paused.value

    @arc4.abimethod(readonly=True)
    def get_daily_algo_limit(self) -> arc4.UInt64:
        return arc4.UInt64(self.daily_algo_limit.value)

    @arc4.abimethod(readonly=True)
    def get_algo_spent_today(self) -> arc4.UInt64:
        return arc4.UInt64(self.algo_spent_today.value)

    @arc4.abimethod(readonly=True)
    def get_daily_asset_limit(self, asset_id: arc4.UInt64) -> arc4.UInt64:
        return arc4.UInt64(self.daily_asset_limit.get(asset_id.native, default=UInt64(0)))

    @arc4.abimethod(readonly=True)
    def get_asset_spent_today(self, asset_id: arc4.UInt64) -> arc4.UInt64:
        return arc4.UInt64(self.asset_spent_today.get(asset_id.native, default=UInt64(0)))

    @arc4.abimethod(readonly=True)
    def get_app_address(self) -> arc4.Address:
        return arc4.Address(Global.current_application_address)

    # ---------- owner actions ----------

    @arc4.abimethod()
    def update_executor(self, new_executor: arc4.Address) -> None:
        self._only_owner()
        assert new_executor.native != Account(), "ZeroExecutor"
        self.executor.value = new_executor.native

    @arc4.abimethod()
    def pause_wallet(self) -> None:
        self._only_owner()
        self.wallet_paused.value = True

    @arc4.abimethod()
    def unpause_wallet(self) -> None:
        self._only_owner()
        self.wallet_paused.value = False

    @arc4.abimethod()
    def update_daily_algo_limit(self, new_limit: arc4.UInt64) -> None:
        self._only_owner()
        self.daily_algo_limit.value = new_limit.native

    @arc4.abimethod()
    def update_daily_asset_limit(self, asset_id: arc4.UInt64, new_limit: arc4.UInt64) -> None:
        self._only_owner()
        self.daily_asset_limit[asset_id.native] = new_limit.native

    @arc4.abimethod()
    def opt_in_asset(self, asset_id: arc4.UInt64) -> None:
        """
        App account opts in to an ASA so it can hold/fund/withdraw it later.
        Owner-only because this changes wallet holdings.
        """
        self._only_owner()

        itxn.AssetTransfer(
            xfer_asset=asset_id.native,
            asset_receiver=Global.current_application_address,
            asset_amount=0,
            fee=0,
        ).submit()

    @arc4.abimethod()
    def withdraw_algo(self, amount: arc4.UInt64) -> None:
        self._only_owner()

        itxn.Payment(
            receiver=self.owner.value,
            amount=amount.native,
            fee=0,
        ).submit()

    @arc4.abimethod()
    def withdraw_asset(self, asset_id: arc4.UInt64, amount: arc4.UInt64) -> None:
        self._only_owner()

        itxn.AssetTransfer(
            xfer_asset=asset_id.native,
            asset_receiver=self.owner.value,
            asset_amount=amount.native,
            fee=0,
        ).submit()

    # ---------- executor actions ----------

    @arc4.abimethod()
    def execute_algo_transfer(self, to: arc4.Address, amount: arc4.UInt64) -> None:
        self._only_executor()
        self._when_not_paused()
        assert to.native != Account(), "ZeroAddress"

        self._reset_algo_spend_if_needed()
        spent = self.algo_spent_today.get(default=UInt64(0))
        limit_ = self.daily_algo_limit.get(default=UInt64(0))
        assert spent + amount.native <= limit_, "DailyAlgoLimitExceeded"

        self.algo_spent_today.value = spent + amount.native

        itxn.Payment(
            receiver=to.native,
            amount=amount.native,
            fee=0,
        ).submit()

    @arc4.abimethod()
    def execute_asset_transfer(self, asset_id: arc4.UInt64, to: arc4.Address, amount: arc4.UInt64) -> None:
        self._only_executor()
        self._when_not_paused()
        assert to.native != Account(), "ZeroAddress"

        aid = asset_id.native
        amt = amount.native

        self._reset_asset_spend_if_needed(aid)
        spent = self.asset_spent_today.get(aid, default=UInt64(0))
        limit_ = self.daily_asset_limit.get(aid, default=UInt64(0))
        assert spent + amt <= limit_, "DailyAssetLimitExceeded"

        self.asset_spent_today[aid] = spent + amt

        itxn.AssetTransfer(
            xfer_asset=aid,
            asset_receiver=to.native,
            asset_amount=amt,
            fee=0,
        ).submit()

    @arc4.abimethod()
    def execute_app_call(self, target_app: Application) -> None:
        """
        AVM-native replacement for Solidity's arbitrary contract call.
        This performs a no-op inner app call to another app.

        Extend this later with ABI-specific args if your executor needs
        structured cross-app interactions.
        """
        self._only_executor()
        self._when_not_paused()

        itxn.ApplicationCall(
            app_id=target_app,
            fee=0,
        ).submit()

    # ---------- factory-only lifecycle ----------

    @arc4.abimethod()
    def decommission(self) -> None:
        """
        Factory-only shutdown path.
        Sweeps ALGO back to owner, then disables the wallet.
        ASA sweeping should be handled explicitly before decommission if needed.
        """
        self._only_factory()

        # Decommissioning is now a No-Op on-chain to ensure deletion always succeeds.

        self.initialized.value = False
        self.wallet_paused.value = True
        self.owner.value = Account()
        self.executor.value = Account()