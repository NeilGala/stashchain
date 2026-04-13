import { expect } from "chai";
import hardhat from "hardhat";

const { ethers } = hardhat;

describe("SupplyChain Contract", function () {

  // SETUP — runs before every test
  let supplyChain;
  let owner;
  let manufacturer;
  let buyer;
  let stranger;

  beforeEach(async function () {
    // Get test wallets — Hardhat gives us 20 fake wallets automatically
    [owner, manufacturer, buyer, stranger] = await ethers.getSigners();

    // Deploy a fresh contract before each test
    const SupplyChain = await ethers.getContractFactory("SupplyChain");
    supplyChain = await SupplyChain.deploy();
    await supplyChain.waitForDeployment();
  });

  // TEST SUITE 1 — Deployment
  describe("Deployment", function () {

    it("Should deploy successfully", async function () {
      const address = await supplyChain.getAddress();
      expect(address).to.be.properAddress;
    });

    it("Should start with zero products", async function () {
      const total = await supplyChain.getTotalProducts();
      expect(total).to.equal(0);
    });

    it("Should set the deployer as contract owner", async function () {
      const contractOwner = await supplyChain.owner();
      expect(contractOwner).to.equal(owner.address);
    });

  });


  // TEST SUITE 2 — Product Registration
  describe("Product Registration", function () {

    it("Should register a product successfully", async function () {
      await supplyChain
        .connect(manufacturer)
        .registerProduct("iPhone 15", "QmTestHash123");

      const product = await supplyChain.getProduct(1);

      expect(product.id).to.equal(1);
      expect(product.name).to.equal("iPhone 15");
      expect(product.ipfsHash).to.equal("QmTestHash123");
      expect(product.manufacturer).to.equal(manufacturer.address);
      expect(product.currentOwner).to.equal(manufacturer.address);
      expect(product.isVerified).to.equal(true);
    });

    it("Should increment product ID for each new product", async function () {
      await supplyChain
        .connect(manufacturer)
        .registerProduct("Product A", "QmHashA");

      await supplyChain
        .connect(manufacturer)
        .registerProduct("Product B", "QmHashB");

      const total = await supplyChain.getTotalProducts();
      expect(total).to.equal(2);

      const product1 = await supplyChain.getProduct(1);
      const product2 = await supplyChain.getProduct(2);

      expect(product1.name).to.equal("Product A");
      expect(product2.name).to.equal("Product B");
    });

    it("Should automatically log MANUFACTURED event on registration", async function () {
      await supplyChain
        .connect(manufacturer)
        .registerProduct("Test Product", "QmHash");

      const events = await supplyChain.getProductEvents(1);

      expect(events.length).to.equal(1);
      expect(events[0].eventType).to.equal(0); // 0 = MANUFACTURED
      expect(events[0].actor).to.equal(manufacturer.address);
    });

    it("Should add product to owner's list", async function () {
      await supplyChain
        .connect(manufacturer)
        .registerProduct("Test Product", "QmHash");

      const ownedProducts = await supplyChain.getProductsByOwner(
        manufacturer.address
      );

      expect(ownedProducts.length).to.equal(1);
      expect(ownedProducts[0]).to.equal(1);
    });

    it("Should emit ProductRegistered event", async function () {
      await expect(
        supplyChain
          .connect(manufacturer)
          .registerProduct("Test Product", "QmHash")
      )
        .to.emit(supplyChain, "ProductRegistered")
        .withArgs(1, "Test Product", manufacturer.address, "QmHash");
    });

    it("Should FAIL if name is empty", async function () {
      await expect(
        supplyChain.connect(manufacturer).registerProduct("", "QmHash")
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should FAIL if IPFS hash is empty", async function () {
      await expect(
        supplyChain.connect(manufacturer).registerProduct("Product", "")
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

  });

  
  // TEST SUITE 3 — Event Logging
  describe("Event Logging", function () {

    beforeEach(async function () {
      // Register a product before each event test
      await supplyChain
        .connect(manufacturer)
        .registerProduct("Test Product", "QmHash");
    });

    it("Should log a SHIPPED event", async function () {
      await supplyChain
        .connect(manufacturer)
        .logEvent(1, 1, "Mumbai Port", "Shipped to buyer"); // 1 = SHIPPED

      const events = await supplyChain.getProductEvents(1);

      expect(events.length).to.equal(2); // MANUFACTURED + SHIPPED
      expect(events[1].eventType).to.equal(1); // 1 = SHIPPED
      expect(events[1].location).to.equal("Mumbai Port");
      expect(events[1].notes).to.equal("Shipped to buyer");
      expect(events[1].actor).to.equal(manufacturer.address);
    });

    it("Should log multiple events in correct order", async function () {
      await supplyChain
        .connect(manufacturer)
        .logEvent(1, 1, "Mumbai", "Shipped"); // SHIPPED

      await supplyChain
        .connect(manufacturer)
        .logEvent(1, 2, "Delhi", "In transit"); // IN_TRANSIT

      await supplyChain
        .connect(manufacturer)
        .logEvent(1, 3, "Destination", "Delivered"); // DELIVERED

      const events = await supplyChain.getProductEvents(1);

      expect(events.length).to.equal(4); // MANUFACTURED + 3 more
      expect(events[1].eventType).to.equal(1); // SHIPPED
      expect(events[2].eventType).to.equal(2); // IN_TRANSIT
      expect(events[3].eventType).to.equal(3); // DELIVERED
    });

    it("Should emit EventLogged event", async function () {
      await expect(
        supplyChain
          .connect(manufacturer)
          .logEvent(1, 1, "Mumbai", "Shipped")
      ).to.emit(supplyChain, "EventLogged");
    });

    it("Should FAIL if non-owner tries to log event", async function () {
      await expect(
        supplyChain
          .connect(stranger)
          .logEvent(1, 1, "Mumbai", "Shipped")
      ).to.be.revertedWith("Not the product owner");
    });

    it("Should FAIL if product does not exist", async function () {
      await expect(
        supplyChain
          .connect(manufacturer)
          .logEvent(999, 1, "Mumbai", "Shipped")
      ).to.be.revertedWith("Product does not exist");
    });

    it("Should FAIL if location is empty", async function () {
      await expect(
        supplyChain.connect(manufacturer).logEvent(1, 1, "", "Some notes")
      ).to.be.revertedWith("Location cannot be empty");
    });

  });


  // TEST SUITE 4 — Ownership Transfer
  describe("Ownership Transfer", function () {

    beforeEach(async function () {
      await supplyChain
        .connect(manufacturer)
        .registerProduct("Test Product", "QmHash");
    });

    it("Should transfer ownership successfully", async function () {
      await supplyChain
        .connect(manufacturer)
        .transferOwnership_SC(1, buyer.address);

      const product = await supplyChain.getProduct(1);
      expect(product.currentOwner).to.equal(buyer.address);
    });

    it("Should add product to new owner's list", async function () {
      await supplyChain
        .connect(manufacturer)
        .transferOwnership_SC(1, buyer.address);

      const buyerProducts = await supplyChain.getProductsByOwner(
        buyer.address
      );
      expect(buyerProducts.length).to.equal(1);
      expect(buyerProducts[0]).to.equal(1);
    });

    it("Should log a SHIPPED event on transfer", async function () {
      await supplyChain
        .connect(manufacturer)
        .transferOwnership_SC(1, buyer.address);

      const events = await supplyChain.getProductEvents(1);
      expect(events.length).to.equal(2); // MANUFACTURED + SHIPPED
    });

    it("Should emit OwnershipTransferred_SC event", async function () {
      await expect(
        supplyChain
          .connect(manufacturer)
          .transferOwnership_SC(1, buyer.address)
      )
        .to.emit(supplyChain, "OwnershipTransferred_SC")
        .withArgs(
          1,
          manufacturer.address,
          buyer.address,
          await ethers.provider.getBlock("latest").then((b) => b.timestamp + 1)
        );
    });

    it("Should FAIL if non-owner tries to transfer", async function () {
      await expect(
        supplyChain
          .connect(stranger)
          .transferOwnership_SC(1, buyer.address)
      ).to.be.revertedWith("Not the product owner");
    });

    it("Should FAIL if transferring to zero address", async function () {
      await expect(
        supplyChain
          .connect(manufacturer)
          .transferOwnership_SC(1, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should FAIL if transferring to yourself", async function () {
      await expect(
        supplyChain
          .connect(manufacturer)
          .transferOwnership_SC(1, manufacturer.address)
      ).to.be.revertedWith("Already the owner");
    });

  });

});