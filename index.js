var express = require('express');
var router = express.Router();
 
const xrpl = require("xrpl")
var mysql = require('mysql');
const { createHash } = require('crypto');

var hasNOM151=0

var master_wallet_seed=<<MASTERWALLETSEED>>
 
 var con = mysql.createConnection({
      host: <<HOTNAME>>,
      user: <<USERNAME>>,
      password: <<PASSWORD>>,
      database: <<DATABASENAME>>,
      port: "3306"
 });

 con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});


router.get("/balance/:walletID", async (req, res) => {
 
  let rbalance= await get_wallet_balance(req.params.walletID)
  res.render("index",{title:req.params.walletID,balance:rbalance });

});



router.get('/set/:usID', function(req, res) {
  var contractID=req.params.usID
  var result=Contract_signed_HASH(0,contractID)
  res.send(result)
});



async function get_wallet_balance(walletID){  
  
  let net = getNet()
  const client = new xrpl.Client(net)
  await client.connect()
   
  const wallet_balance = (await client.getXrpBalance(walletID))      
   const response = await client.request({
    "command": "account_info",
    "account": walletID,
    "ledger_index": "validated"
  })

 client.disconnect()
 return wallet_balance;
}


function getNet() {
  let net
     net = "wss://s.altnet.rippletest.net:51233"
  return net
} 

 

function Contract_Create_Wallet(userID,contractID){

  const new_wallet = xrpl.Wallet.generate()
 
    var sql = "INSERT INTO wallets (userID,contractID,seed) VALUES ('"+userID+"','"+contractID+"','"+new_wallet.seed+"')";
    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log("wallet created");
    });
  
    console.log(new_wallet);
   
// ACTIVATE THE NEW ACCOUNT SENDING XRP 
    let from_wallet_seed=master_wallet_seed
    let to_wallet = new_wallet.classicAddress
    let to_wallet_seed = new_wallet.seed // NEEDED FOR INVENTORY NFT
    var sendAmount=1000
    ActivateAccountSendXRP(from_wallet_seed,to_wallet,to_wallet_seed,sendAmount)

}


function contract_wallet_exist(userID,contractID){
  
    con.query("SELECT * FROM wallets WHERE contractID = '"+contractID+"'", function (err, result) {
      if (err) throw err;
      
      if (result.length>0){
        console.log("wallet already exist");
        return "1"  
        
      }else{
        
        Contract_Create_Wallet(userID,contractID)
        console.log("new contract wallet created");
      }
    });
  
 
}


 async function Contract_Create_NFT_Inventory(to_wallet_seed,standbyTokenUrlField,standbyFlagsField,standbyTransferFeeField){

  let net = getNet()
  const client = new xrpl.Client(net)
  await client.connect()
  
  const standby_wallet = xrpl.Wallet.fromSeed(to_wallet_seed)

  const transactionJson = {
    "TransactionType": "NFTokenMint",
    "Account": standby_wallet.classicAddress,
    "URI": xrpl.convertStringToHex(standbyTokenUrlField),
    "Flags": parseInt(standbyFlagsField),
    "TransferFee": parseInt(standbyTransferFeeField),
    "NFTokenTaxon": 0 
  }
  const tx = await client.submitAndWait(transactionJson, { wallet: standby_wallet} )

  client.disconnect()
  console.log("NFT INVENTORY CREATED WITH HASH RELATED TO NOM-151")

}

function Contract_signed_HASH(userID,contractID){

   con.query("SELECT * FROM contracts WHERE contractID = '"+contractID+"'", function (err, result) {
    if (err) throw err;
    
    if (result.length>0){
      console.log("signded")
      hasNOM151=result[0].hash
      contract_wallet_exist(userID,contractID)
    }else{
      console.log("not signed yet") 
      return false
    }
  })
  
}
