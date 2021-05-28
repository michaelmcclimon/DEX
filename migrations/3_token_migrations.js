const Link = artifacts.require("Link");
const Dex = artifacts.require("Dex");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(Link);
  let dex = await Dex.deployed()
  let link = await Link.deployed()
  await link.approve(dex.address, 500)
  dex.addToken(web3.utils.fromUtf8("LINK"), link.address)
  await dex.deposit(100, web3.utils.fromUtf8("LINK"))
  let balanmceOfLink = dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
  console.log(balanmceOfLink);
};
