pragma solidity ^0.5.00;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    // Allow SafeMath functions to be called for all uint256 types
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Reference to the data contract
    FlightSuretyData flightsuretydata;

    // Flight status codes, most are ignored
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    // 20 is the only late code that pays insurance
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    // account used to deploy the contract
    address private contractOwner;
    // contract will multiply this value by the premium to credit passengers
    uint private constant premiumMultiplier = 2;
    // passengers can insure a flight up to the maxPremium
    uint private constant maxPremium = 1 ether;
    // value an airline must pay to become funded and participate
    uint private constant fundcost = 10 ether;
    // modify this value to require consensus from more airlines (1 = all, 2 = 1/2, 3 = 1/3, etc...)
    uint private constant dividentForRegistration = 2;
    // sets how many airlines will automatically register without consensus
    uint private constant airlineAutoRegister = 4;

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * Modifier that requires the "operational" boolean variable to be "true"
    * This is used on all state changing functions to pause the contract in
    * the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
         // Modify to call data contract's status
        require(isOperational(), "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * Modifier that requires an airline is funded before calling a function
    */
    modifier requireAirlineFunded()
    {
        require(flightsuretydata.isAirlineFunded(msg.sender), "Caller is not a funded airline");
        _;
    }

    /**
    * Modifier that requires an airline is registered before calling a function
    */
    modifier requireAirlineRegistered()
    {
        require(flightsuretydata.isAirlineRegistered(msg.sender), "Caller is not a registered airline");
        _;
    }

    /**
    * Modifier that requires the value sent to fund an airline is at least the
    * cost of funding
    */
    modifier fundedEnough()
    {
        require(msg.value >= fundcost, "Insufficient funding");
        _;
    }

    /**
    * Modifier that will refund the airline if they send too much ether when
    * funding.  Only the extra is refunded.
    */
    modifier refundOverFunding()
    {
        _;
        uint amountToReturn = msg.value - 10 ether;
        if(amountToReturn > 0){
            msg.sender.transfer(amountToReturn);
        }
    }

    /**
    * Modifier that will refund a passenger if they send too much ether when
    * purchasing insurance.  There is a maximum premium in effect.
    */
    modifier refundOverInsurance()
    {
        _;
        uint amountToReturn = msg.value - maxPremium;
        if(amountToReturn > 0){
            msg.sender.transfer(amountToReturn);
        }
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * Contract constructor
    * Takes the address of the FlightSuretyData contract (that is already deployed)
    * to decouple some application logic from data storage management
    */
    constructor(address payable dataContract) public
    {
        contractOwner = msg.sender;
        flightsuretydata = FlightSuretyData(dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * Check if this contract is operational
    */
    function isOperational() public view returns(bool)
    {
        return flightsuretydata.isOperational();  // Modify to call data contract's status
    }

    /**
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus(bool mode) external requireContractOwner
    {
        flightsuretydata.setOperatingStatus(mode);
    }

    /**
    * Check if an airline is funded
    * Returns a bool that indicates if the airline contributed 'fundcost' ether to become funded
    */
    function isAirlineFunded(address airline) public view returns(bool)
    {
        require(airline != address(0), "'account' must be a valid address.");
        return flightsuretydata.isAirlineFunded(airline);
    }

    /**
    * Check if an airline is registered
    * Returns bool that indicates if the airline is registered
    */
    function isAirlineRegistered(address airline) public view returns(bool)
    {
        require(airline != address(0), "'account' must be a valid address.");
        return flightsuretydata.isAirlineRegistered(airline);
    }

    /**
    * Check if an airline is nominated
    * Nominated airlines have had at least one airline attempt to register them.  Once they
    * reach a certain threshold of nominations the airline is considered 'registered'
    * Returns bool that indicates if the airline is nominated
    */
    function isAirlineNominated(address airline) public view returns (bool)
    {
        require(airline != address(0), "'account' must be valid address.");
        return flightsuretydata.isAirlineNominated(airline);
    }

    /**
    * Check if a passenger is insured for a specific flight.
    * A user can only call this function to check if their address was used to insure a flight, as it
    * uses msg.sender as the passenger identity (provides some privacy in the dapp).
    */
    function isPassengerInsured(address _airline, string memory _flight, uint256 _timestamp) public view returns (bool)
    {
        bytes32 key = getFlightKey(_airline, _flight, _timestamp);
        return flightsuretydata.isPassengerInsured(key,msg.sender);
    }

    /**
    * Allows anyone to check if a flight is registered.
    * Returnd a bool indicating whether the flight is registered or not.
    */
    function isFlightRegistered(address _airline, string memory _flight, uint256 _timestamp) public view returns (bool)
    {
        bytes32 key = getFlightKey(_airline, _flight, _timestamp);
        return flightsuretydata.isFlightRegistered(key);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/


   /**
    * Attempt to register an airline.
    * The first airline deploys the data contract and is imediately registered by the data contract's
    * contructor (not using this function here).
    * Only existing registered and funded airlines can register other airlines until the number of airlines
    * registered reaches 'airlineAutoRegister'.
    * Any airline registration after 'airlineAutoRegister' is reached requires multi-party consensus.
    * The number of airlines required for consensus is determined by dividing the current number of
    * registered airlines by 'dividentForRegistration'.
    * Registered airlines cannot participate until they fund 'fundcost' ether.
    * If the actions of this function resulted in an airline becomine fully 'registered' return true.
    */
    function registerAirline(address candidate) external
    requireIsOperational
    requireAirlineRegistered
    requireAirlineFunded
    returns(bool registered)
    {
        require(!isAirlineRegistered(candidate), "Airline is already registered.");
        // if less than 'airlineAutoRegister' airlines have registered this airline is auto registered
        // it is NOT funded, so cannot nominate other airlines or register flight for insurance
        if(flightsuretydata.registeredAirlines()<airlineAutoRegister){
            // nominated, registered, not funded
            flightsuretydata.registerAirline(candidate, true, true, false);
        }
        // check if this is the first time this airline has been nominated, if so it has to be
        // provisioned in the data contract by by calling registerAirline
        else if(!isAirlineNominated(candidate)){
            // nominated, not registered, not funded
            flightsuretydata.registerAirline(candidate, true, false, false);
            // this is guaranteed to be the first nomination, threshold of 99 insures it won't be 'registered'
            flightsuretydata.nominateAirline(candidate, msg.sender, 99);
        }
        // the airline has already been nomninated and exists, calculare the consensus threshold
        // and add a nomination to see if this ariline becomes fully registered.
        else {
            // calculate the consensus threshold
            uint threshold = flightsuretydata.registeredAirlines()/dividentForRegistration;
            // nominate the airline as it already has at least one nomination (this could result in becoming fully registered)
            flightsuretydata.nominateAirline(candidate, msg.sender, threshold);
        }
        // return whether any action above led to the airline being registered
        return isAirlineRegistered(candidate);
    }

    /**
    * Method that accepts funds from a registered airline to become 'funded'.
    * The funds are transfered to the data contract for holding so that it can
    * pay out insureance claims.
    * Return true if funding is successful.
    */
    function fundAirline() external payable
    requireIsOperational
    requireAirlineRegistered // only registered airlines can fund
    fundedEnough // make sure airline sent enough ether
    refundOverFunding // send back any change if airline sent too much
    returns(bool success)
    {
        // don't accept funding from airlines that have already funded
        require(!isAirlineFunded(msg.sender), "Airline is already funded");
        // send the funds on to the data contract to be stored
        flightsuretydata.fund.value(fundcost)(msg.sender);
        return true;
    }

   /**
    * Register a future flight for insuring.
    * You can hard code the list in the DAPP or use this function
    * to register flights and then have the list of flights appear
    * to the dapp for the user to choose from.
    * Could choose to only show flights that are available in the future.
    */
    function registerFlight(string memory _flight, uint256 _timestamp) public
    requireAirlineFunded
    requireAirlineRegistered
    {
        // using msg.sender to guarantee that an airline can only register flights they own
        bytes32 key = getFlightKey(msg.sender, _flight, _timestamp);
        flightsuretydata.registerFlight(key);
    }

    /**
    * Passengers call this function and pass it a premium to insure a flight.  If the passenger sends
    * more then 'maxPremium' ether, the surplus is refunded.  Uses msg.sender to ensure the caller
    * can only purchase insurance for themselves.
    */
    function InsureFlight(address _airline, string memory _flight, uint256 _timestamp) public payable
    refundOverInsurance
    {
        bytes32 key = getFlightKey(_airline, _flight, _timestamp);
        uint256 amountToSend = maxPremium;
        // the passenger can insure for less then maxPremium, but not more
        if(msg.value < maxPremium){
            amountToSend = msg.value;
        }
        flightsuretydata.buy.value(amountToSend)(key,msg.sender);
    }

   /**
    * Called after oracle has updated flight status
    * Triggered when the oracle comes back with a result
    * Only react to '20' and look for passengers that should
    * be credited.
    */
    function processFlightStatus(address _airline, string memory _flight, uint256 _timestamp, uint8 statusCode) internal
    requireIsOperational
    {
        // check if the flight is late on account of the airline, potentially triggering insurance payment
        if(statusCode == STATUS_CODE_LATE_AIRLINE){
            bytes32 key = getFlightKey(_airline, _flight, _timestamp);
            // credit the account of each of the recipients
            flightsuretydata.creditInsuree(key, premiumMultiplier, msg.sender);
        }
    }


    /**
    * Generate a request for oracles to fetch flight information
    * get responses from multipe oracles and decide how to pick what response
    * to pass along (majority?)
    * a button in the dapp will initiate a request for info from orcales (instead of
    * an event originating from the orcales.
    */

    function fetchFlightStatus(address airline, string calldata flight, uint256 timestamp) external
    requireIsOperational
    {
        uint8 index = getRandomIndex(msg.sender);
        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({requester: msg.sender, isOpen: true});
        emit OracleRequest(index, airline, flight, timestamp);
    }

    /**
    * Anyone can attempt to withdraw credits from the contract and the data contract will
    * handle working out how much there is available and sending it direclty to the
    * passenger.  The application just brokers the request.  A passenger must withdraw all
    * credits at once (the logic exists to specify a certain amount but for simplicity sake
    * it's all or nothing for this assignment).
    */
    function withdrawCredits() public
    requireIsOperational
    {
        flightsuretydata.pay(msg.sender);
    }

    /********************************************************************************************/
    /*                                     TESTING METHODS                                      */
    /********************************************************************************************/
    /**
    * The following methods are primarly used for testing and to facilitate debugging in the dapp.
    */

    /**
    * Return the address of the owner of this contract.
    */
    function getOwner() external view requireContractOwner returns(address owner)
    {
        return contractOwner;
    }

    /**
    * Return a count of how many airlines have been nominated and fully registered (but not necessarily funded).
    */
    function getRegisteredAirlineCount() external view requireContractOwner returns(uint count)
    {
        return flightsuretydata.registeredAirlines();
    }

    /**
    * Return the current credit balance for a passenger, if a balance exists.
    */
    function getPassengerCreditBalance() external view returns(uint256 balance){
        return flightsuretydata.getPassengerCreditBalance(msg.sender);
    }

    /**
    * This function would not exist in a production contract but is VERY usefully for testing.  Force a flight
    * status to be processed, bypassing the oracles for simplicity sake.
    */
    function forceProcessFlightStatus(address _airline, string calldata _flight, uint256 _timestamp, uint8 statusCode) external
    requireContractOwner
    requireIsOperational
    {
        processFlightStatus(_airline, _flight, _timestamp, statusCode);
    }

    /***********************************************************************/
    /* ORACLE MANAGEMENT - unmodified from template aside from formatting  */
    /***********************************************************************/
    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);

    // Register an oracle with the contract
    // Register 15 - 20 in testing
    // Try using 100-500 when the project is ready
    function registerOracle() external payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");
        uint8[3] memory indexes = generateIndexes(msg.sender);
        // debugging
        //indexes[0] = 1;
        //indexes[1] = 1;
        //indexes[2] = 1;
        oracles[msg.sender] = Oracle({ isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");
        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(uint8 index, address airline, string calldata flight, uint256 timestamp, uint8 statusCode) external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");

        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(address airline, string memory flight, uint256 timestamp) internal pure returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8)
    {
        uint8 maxValue = 9;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

}
