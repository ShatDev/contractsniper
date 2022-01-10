Steps:
1. Deploy the contract/sniper.sol 
2. Change "PancakeSwapRouter" and "WBNB" from index.js
3. Change "sniperAddress" from public/abis.js
4. Run "nodemon" or "node index.js"


 :
1. Enter the inputs to the site
2. Connect your wallet 
3. Add fund to the contract for snipe,
    and you will have a new wallet private key and address in your cokkies this address is for calling the contract function without metamask after you funded.
    Fund will be (gas)+(amount will use in sniping)
    [this "gas"(0.03bnb) will transfer to your new account] 
4. Now click on snipe then this will wait for "addLiquidityETH" function call for the token... after that buying will start...!!

Working :
    Detect honeypot tokens from contract itself
    Sell after x% profit after sniping
