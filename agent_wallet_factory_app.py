from algopy import (
    ARC4Contract,
    Account,
    Application,
    BoxMap,
    Global,
    Txn,
    UInt64,
    itxn,
    arc4,
)

from agent_wallet_app import AgentWalletApp


class AgentWalletFactoryApp(ARC4Contract):
    def __init__(self) -> None:
        # maps user account -> wallet app id
        self.user_wallet_app = BoxMap(Account, UInt64, key_prefix=b"uwa_")

    @arc4.abimethod()
    def create_wallet(
        self,
        executor: arc4.Address,
        daily_algo_limit: arc4.UInt64,
    ) -> arc4.UInt64:
        """
        Creates one wallet app per user and stores the created wallet app id.
        """
        owner = Txn.sender
        assert owner not in self.user_wallet_app, "WalletAlreadyExists"
        assert executor.native != Account(), "ZeroExecutor"

        # Create wallet app and call its initialize(create="require") method
        create_txn = arc4.arc4_create(
            AgentWalletApp.initialize,
            arc4.Address(owner),
            executor,
            daily_algo_limit,
            Txn.application_id,
        )

        created_app = create_txn.created_app
        self.user_wallet_app[owner] = created_app.id

        return arc4.UInt64(created_app.id)

    @arc4.abimethod(readonly=True)
    def get_my_wallet_app_id(self) -> arc4.UInt64:
        app_id = self.user_wallet_app.get(Txn.sender, default=UInt64(0))
        return arc4.UInt64(app_id)

    @arc4.abimethod()
    def delete_wallet(self) -> None:
        """
        Force unlinks the user's wallet from the factory.
        Bypasses the decommission call to ensure unlinking succeeds even if the contract is frozen.
        """
        owner = Txn.sender
        assert owner in self.user_wallet_app, "WalletNotFound"
        
        # We REMOVED the arc4.abi_call to decommission.
        # This ensures the user can ALWAYS unlink even if their wallet app is broken/frozen.
        del self.user_wallet_app[owner]

    @arc4.abimethod()
    def reclaim_funds(self, receiver: Account) -> None:
        """Emergency withdrawal of Factory balance (Admin only)."""
        assert Txn.sender == Global.creator_address, "Unauthorized"
        itxn.Payment(
            receiver=receiver,
            amount=Global.current_application_address.balance - 100_000,
            fee=0
        ).submit()

    @arc4.abimethod(allow_actions=["DeleteApplication"])
    def delete_application(self) -> None:
        """Allow creator to delete the app and reclaim the full balance."""
        assert Txn.sender == Global.creator_address, "Unauthorized"
        itxn.Payment(
            receiver=Global.creator_address,
            amount=0,
            close_remainder_to=Global.creator_address,
            fee=0
        ).submit()