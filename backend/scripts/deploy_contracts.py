import solcx
import json
import os
import time
from web3 import Web3
from dotenv import load_dotenv
load_dotenv()

# Network Setup
rpc_url = os.getenv('RPC_URL', 'https://testnet-rpc.monad.xyz')
w3 = Web3(Web3.HTTPProvider(rpc_url))
executor_key = os.getenv('EXECUTOR_PRIVATE_KEY')
executor_account = w3.eth.account.from_key(executor_key)

print(f"Deploying with Executor: {executor_account.address}")

# 1. Compile
sol_path = os.path.abspath("../walletcontracttemplate.sol")
import_map = {
    "@openzeppelin/contracts": os.path.abspath("../frontend/node_modules/@openzeppelin/contracts")
}
try:
    compiled_sol = solcx.compile_files(
        [sol_path], 
        output_values=["abi", "bin"], 
        solc_version="0.8.20",
        import_remappings=import_map
    )
except Exception as e:
    print(f"Compilation Failed: {str(e)}")
    exit(1)

# 2. Get the contracts (Find by suffix)
wallet_contract_key = None
factory_contract_key = None

for k in compiled_sol.keys():
    if k.endswith(":AgentWallet"):
        wallet_contract_key = k
    if k.endswith(":AgentWalletFactory"):
        factory_contract_key = k

if not wallet_contract_key or not factory_contract_key:
    print(f"Keys not found! Available: {list(compiled_sol.keys())}")
    exit(1)

wallet_abi = compiled_sol[wallet_contract_key]['abi']
wallet_bin = compiled_sol[wallet_contract_key]['bin']
factory_abi = compiled_sol[factory_contract_key]['abi']
factory_bin = compiled_sol[factory_contract_key]['bin']

def deploy_contract(abi, bin, args=None):
    contract = w3.eth.contract(abi=abi, bytecode=bin)
    tx = contract.constructor(*(args or [])).build_transaction({
        'from': executor_account.address,
        'nonce': w3.eth.get_transaction_count(executor_account.address),
        'gas': 4000000,
        'gasPrice': w3.eth.gas_price,
        'chainId': w3.eth.chain_id
    })
    signed_tx = w3.eth.account.sign_transaction(tx, executor_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print(f"Waiting for deployment: {tx_hash.hex()}")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    return receipt.contractAddress

# 3. Deploy
wallet_impl = deploy_contract(wallet_abi, wallet_bin)
print(f"New Wallet Implementation: {wallet_impl}")

# Factory takes (implementation, initial_executor)
factory_addr = deploy_contract(factory_abi, factory_bin, [wallet_impl, executor_account.address])
print(f"NEW FACTORY ADDRESS: {factory_addr}")

# 4. Save to files immediately!
with open("final_factory_info.json", "w") as f:
    json.dump({
        "factory_address": factory_addr,
        "wallet_implementation": wallet_impl,
        "executor": executor_account.address,
        "timestamp": time.time()
    }, f, indent=2)

print("\n--- UPDATING ENV ---")
# Update .env
with open(".env", "r") as f:
    lines = f.readlines()
with open(".env", "w") as f:
    for line in lines:
        if line.startswith("FACTORY_ADDRESS="):
            continue
        f.write(line)
    f.write(f"FACTORY_ADDRESS={factory_addr}\n")

print(f"DONE! Factory Address: {factory_addr}")
