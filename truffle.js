var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "give fever spy flag avocado drip debris boost boss upset crystal pill";

module.exports = {
  networks: {
    development: {
      //provider: function() {
        //return new HDWalletProvider(mnemonic, "http://127.0.0.1:9545/", 0, 50);
      //  return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      //},
      //network_id: '*',
      //gas: 9999999,
      //gas: 4600000
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4600000
    }
  },
  compilers: {
    solc: {
      version: "^0.5.0"
    }
  }
};