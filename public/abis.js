const sniperAddress = '0x567D77Cd43fAd35aA1eD5090E66330968121F6D6'
const sniperABI = [
    {
        "inputs": [
            {
                "internalType": "address payable",
                "name": "anotherAccountForCalling",
                "type": "address"
            }
        ],
        "name": "addFunds",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }, {
        "inputs": [
            {
                "internalType": "address",
                "name": "tokenAddress",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amountToBuy",
                "type": "uint256"
            },
            {
                "internalType": "address[]",
                "name": "walletAddresses",
                "type": "address[]"
            },
            {
                "internalType": "uint256",
                "name": "howManyTransactionToDo",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "slippage",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "afterSnipeFundsOut",
                "type": "bool"
            }
        ],
        "name": "snipePancakeSwap",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
]






