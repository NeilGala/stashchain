// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// Tracks products from manufacture to delivery on-chain

contract SupplyChain is Ownable {

    enum EventType {
        MANUFACTURED,
        SHIPPED,
        IN_TRANSIT,
        DELIVERED,
        RETURNED
    }

    struct Product {
        uint256 id;
        string name;
        string ipfsHash;
        address manufacturer;
        address currentOwner;
        bool isVerified;
        uint256 createdAt;
    }

    struct SupplyChainEvent {
        uint256 productId;
        EventType eventType;
        address actor;
        string location;
        string notes;
        uint256 timestamp;
    }

    uint256 private _productIdCounter;

    //productId -> Product
    mapping (uint256 => Product) public products;

    // productId => array of events
    mapping(uint256 => SupplyChainEvent[]) public productEvents;

    // address => array of productIds they own
    mapping(address => uint256[]) public ownerProducts;

    event ProductRegistered(
        uint256 indexed productId,
        string name,
        address indexed manufacturer,
        string ipfsHash
    );

    event EventLogged (
        uint256 indexed productId,
        EventType eventType,
        address indexed actor,
        string location,
        uint256 timestamp
    );

    event OwnershipTransferred_SC(
        uint256 indexed productId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    modifier productExists (uint256 _productId) {
        require(
            _productId > 0 && _productId <= _productIdCounter,
            "Product does not exist"
        );
        _;
    }

    modifier onlyProductOwner(uint256 _productId) {
        require(
            products[_productId].currentOwner == msg.sender,
            "Not the product owner"
        );
        _;
    }

    constructor () Ownable(msg.sender) {
        _productIdCounter = 0;
    }

    //Write Functions
    function registerProduct (
        string memory _name,
        string memory _ipfsHash
    ) external returns (uint256) {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");

        _productIdCounter++;
        uint256 newProductId = _productIdCounter;

        products[newProductId] = Product({
            id: newProductId,
            name: _name,
            ipfsHash: _ipfsHash,
            manufacturer: msg.sender,
            currentOwner: msg.sender,
            isVerified: true,
            createdAt: block.timestamp
        });

        ownerProducts[msg.sender].push(newProductId);

        // Log the first event automatically
        productEvents[newProductId].push(SupplyChainEvent({
            productId: newProductId,
            eventType: EventType.MANUFACTURED,
            actor: msg.sender,
            location: "Origin",
            notes: "Product registered on StashChain",
            timestamp: block.timestamp
        }));

        emit ProductRegistered(newProductId, _name, msg.sender, _ipfsHash);
        emit EventLogged(
            newProductId,
            EventType.MANUFACTURED,
            msg.sender,
            "Origin",
            block.timestamp
        );

        return newProductId;
    }

    function logEvent (
        uint256 _productId,
        EventType _eventType,
        string memory _location,
        string memory _notes
    ) external productExists(_productId) onlyProductOwner(_productId) {
        require(bytes(_location).length > 0,"Location cannot be empty");

        productEvents[_productId].push(SupplyChainEvent({
            productId: _productId,
            eventType: _eventType,
            actor: msg.sender,
            location: _location,
            notes: _notes,
            timestamp: block.timestamp
        }));

        emit EventLogged(
            _productId,
            _eventType,
            msg.sender,
            _location,
            block.timestamp
        );
    }

    function transferOwnership_SC (
        uint256 _productId,
        address _newOwner
    ) external productExists(_productId) onlyProductOwner(_productId) {
        require(_newOwner != address(0), "Invalid address");
        require(_newOwner != msg.sender, "Already the owner");

        address previousOwner = products[_productId].currentOwner;
        products[_productId].currentOwner = _newOwner;

        ownerProducts[_newOwner].push(_productId);

        // Log ownership transfer as an event
        productEvents[_productId].push(SupplyChainEvent({
            productId: _productId,
            eventType: EventType.SHIPPED,
            actor: msg.sender,
            location: "Transfer",
            notes: "Ownership transferred",
            timestamp: block.timestamp
        }));

        emit OwnershipTransferred_SC(
            _productId,
            previousOwner,
            _newOwner,
            block.timestamp
        );
    }

    //Read functions
    function getProduct (uint256 _productId) 
    external
    view
    productExists(_productId)
    returns (Product memory)
    {
        return products[_productId];
    }

    function getProductEvents(uint256 _productId)
        external
        view
        productExists(_productId)
        returns (SupplyChainEvent[] memory)
    {
        return productEvents[_productId];
    }

    function getProductsByOwner(address _owner)
        external
        view
        returns (uint256[] memory)
    {
        return ownerProducts[_owner];
    }

    function getTotalProducts() external view returns (uint256) {
        return _productIdCounter;
    }
}