pragma solidity ^0.5.00;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/***************************************************/
/* FlightSurety Data Smart Contract                */
/***************************************************/
contract FlightSuretyData {
    // Allow SafeMath functions to be called for all uint256 types
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Account used to deploy contract
    address private contractOwner;
    // Blocks all state changes throughout the contract if false
    bool private operational = true;
    // Most of this contract's functionality requires an authorized contract to call it
    mapping (address => uint256) authorizedContracts;
    // the number of airlines that are registered (but not necessarily funded)
    uint public registeredAirlines;

    // InsuranceContract could store more information, but for this assignment it just
    // tracks the passenger's address and the premium they paid
    // Removed as it seemed to cause stack issues
    //struct InsuranceContract {
    //    uint256 premium;
    //    address passenger;
    //}

    // A registered flight tracks the core flight details as well as a list
    // of passenger InsuranceContract instances
    // Greatly simplified due to some difficulties...
    struct Flight {
        bool isRegistered;
        //uint8 statusCode;
        //uint256 updatedTimestamp;
        //address airline;
        // uses the passenger's address to map to their premium
        mapping (address => uint256) premiums;
    }

    // a unique key is used to retrieve flights
    mapping(bytes32 => Flight) private flights;

    // Stores information about airlines that have been nominated
    struct AirlineProfile {
        // once an airline exists it's nominated
        bool isNominated;
        // after a threshold of nominations an airline is registered
        bool isRegistered;
        // once an airline sends enough ether to the contract it's funded
        bool isFunded;
        // a list of airlines that have nominated this one
        address[] nominations;
    }
    // use the airline address to find the associated profile
    mapping(address => AirlineProfile) public airlineProfiles;

    // store a mapping of passenger addresses and their credit balances
    mapping(address => uint256) private creditBalances;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
    * Constructor
    * The deploying account becomes contractOwner
    */
    constructor() public
    {
        // deploying account becomes the owner
        contractOwner = msg.sender;
        // make sure the contract owner is an authorized contract (design decision)
        authorizedContracts[msg.sender] == 1;
        // the contract owner is also the first airline
        AirlineProfile memory airline = AirlineProfile(true, true, false, new address[](0));
        airlineProfiles[msg.sender] = airline;
        registeredAirlines = 1;
    }

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
        require(operational, "Contract is currently not operational");
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
    * Modifier that requires the calling contract is authorized to be the function caller
    */
    modifier isCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * Get operating status of contract
    * Returns a bool that is the current operating status
    */
    function isOperational() public view returns(bool)
    {
        return operational;
    }

    /**
    * Sets contract operations on/off
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus(bool mode) external
    isCallerAuthorized
    {
        operational = mode;
    }

    /**
    * Allow contract owners to add additional authorized contracts, that enable authorized contracts
    * to invoke much of this contracts functionality.
    */
    function authorizeContract(address addressToAuth) external
    requireIsOperational
    requireContractOwner
    {
        authorizedContracts[addressToAuth] = 1;
    }

    /**
    * A formally authorized contract will no longer be able to invoke much of
    * this contracts functionality.
    */
    function deauthorizeContract(address dataContract) external
    requireIsOperational
    requireContractOwner
    {
        delete authorizedContracts[dataContract];
    }

    /**
    * Check if a given passenger is insured for a flight.  These calls are delegated
    * through an authorized contract.
    */
    function isPassengerInsured(bytes32 _flightkey, address _passenger) public view
    returns(bool)
    {
        if(flights[_flightkey].premiums[_passenger] > 0)
            return true;
        return false;
    }

    /**
    * Check if a given airline is funded.  These calls are delegated
    * through an authorized contract.
    */
    function isAirlineFunded(address _airline) external view
    returns(bool)
    {
        return airlineProfiles[_airline].isFunded;
    }

    /**
    * Check if a given airline is registered.  These calls are delegated
    * through an authorized contract.
    */
    function isAirlineRegistered(address _airline) external view
    returns(bool)
    {
        return airlineProfiles[_airline].isRegistered;
    }

    /**
    * Check if a given airline is nominated.  These calls are delegated
    * through an authorized contract.
    */
    function isAirlineNominated(address _airline) external view
    returns(bool)
    {
        return airlineProfiles[_airline].isNominated;
    }

    /**
    * Check if a given flight is registered.  These calls are delegated
    * through an authorized contract.
    */
    function isFlightRegistered(bytes32 _flightkey) public view
    returns(bool)
    {
        return flights[_flightkey].isRegistered;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * Attempt to register an airline.
    * Can only be called from FlightSuretyApp contract.  Airlines are passed to the registerAirline
    * function but aren't fully registered unless _registered argument is passed in as true.  This
    * function basically ensure the airline exists and can be further nominated to become registered.
    */
    function registerAirline(address candidate, bool _nominated, bool _registered, bool _funded) external
    requireIsOperational
    isCallerAuthorized
    {
        // if there is already an entry for this airline don't add it again (should have called nominateAirline)
        require(!airlineProfiles[candidate].isNominated, "Airline already exists");
        // create an instance of AirlineProfile strcut
        AirlineProfile memory airline = AirlineProfile(_nominated, _registered, _funded, new address[](0));
        airlineProfiles[candidate] = airline;
        // some airlines are auto registered without consensus, increment the number of registered airlines if that's the case
        if(_registered){
            registeredAirlines = registeredAirlines + 1;
        }
    }

    /**
    * Once an airline exists in the airlineProfiles mapping, an airline can be nomninated by another airline.
    * First ensure an airline cannot nominate the same airline twice.  Then add the nominator to the list
    * of airlines that have already nominated this airline.  If the number of nominations exceeds the threshold
    * for consensus, then the airline is fully registered and can participate in othe nominations and offering
    * insurance.
    */
    function nominateAirline(address _nominatedAirline, address nominator, uint threshold) external
    requireIsOperational
    isCallerAuthorized
    returns(uint nominationCount)
    {
        // cannot nominate an airline that doesn't exist in the mapping yet (requires a call to registerAirline)
        require(airlineProfiles[_nominatedAirline].isNominated,"Airline does not exist");
        // ensure there are no duplicate nominators, i.e. an airline can't nominate the same airline twice
        bool isDuplicate = false;
        for(uint c = 0; c < airlineProfiles[_nominatedAirline].nominations.length; c++){
            if(airlineProfiles[_nominatedAirline].nominations[c] == nominator){
                isDuplicate = true;
                break;
            }
        }
        require(!isDuplicate, "Sponsoring airline has already nominated this candidate");

        // add the nominator to a growing list of nominations
        airlineProfiles[_nominatedAirline].nominations.push(nominator);
        // if we have enough nominations set this airline to registered status
        if (airlineProfiles[_nominatedAirline].nominations.length >= threshold){
            airlineProfiles[_nominatedAirline].isRegistered = true;
            // add to the running total of registered airlines
            registeredAirlines = registeredAirlines + 1;
        }
        // return a nomination count for debugging
        return airlineProfiles[_nominatedAirline].nominations.length;
    }

    /**
    * Registering a flight involves deriving a unique key (using getFlighKey) and adding an instance of
    * the flight struct to the flight mapping.
    */
    function registerFlight(bytes32 key) external
    requireIsOperational
    isCallerAuthorized
    returns(bool)
    {
        // ensure the flight isn't already registered
        require(!isFlightRegistered(key),"Flight is already registered");
        Flight memory f1 = Flight(true);
        flights[key] = f1;
        return true;
    }

   /**
    * Buy insurance for a flight
    * Passenger can purchase up to a maximum premium set in the FlightSuretyApp
    * Flight numbers and timestamps are fixed and defined in the dapp client (hard coded)
    */
    function buy(bytes32 _flightkey, address _passenger) external payable
    requireIsOperational
    isCallerAuthorized
    {
        // Flight has to exist, otherwise bail
        require(isFlightRegistered(_flightkey),"Flight does not exist, or is not registered");
        // If the passenger is already insured, bail, you can't insure twice
        require(!isPassengerInsured(_flightkey, _passenger),"Passenger can't buy insurance for the same flight twice");
        uint256 val = msg.value;
        flights[_flightkey].premiums[_passenger] = val;
    }

    /**
     *  Credits payouts to insurees
     *  Given a flight key find all passengers that are insured for the flight
     *  and credit their account using 'multiplier' applied to their premium.
    */
    function creditInsuree(bytes32 flightkey, uint multiplier, address payee) external
    requireIsOperational
    isCallerAuthorized
    {
        require(!isPassengerInsured(flightkey, payee),"Passenger is not insured for this flight");
        uint256 credit = multiplier.mul(flights[flightkey].premiums[payee]);
        flights[flightkey].premiums[payee] = 0;
        creditBalances[payee].add(credit);
    }

    /**
    * Return the current credit balance for a passenger as a uint256
    */
    function getPassengerCreditBalance(address passenger) public view
    isCallerAuthorized
    returns(uint256 balance)
    {
        balance = creditBalances[passenger];
        return balance;
    }

    /**
     * Transfers eligible payout funds to insuree via the application contract.
     * Passengers make the request to the app and the app brokers it through to the
     * data contract.
    */
    function pay(address payable payee) external payable
    requireIsOperational
    isCallerAuthorized
    {
        // checks
        require(creditBalances[payee] > 0, "Passenger has no credit balance");
        // effects
        uint256 prev = creditBalances[payee];
        creditBalances[payee] = creditBalances[payee].sub(prev);
        // interaction
        payee.transfer(prev);
    }

    /**
     * Transfers a portion of the passengers credit balance via the application contract
     * Passengers make the request to the app and the app brokers it through to the
     * data contract.
     * Not used in this assignment but could allow insuree to withdraw a smaller amount
     * then their total credit balance.
    */
    function pay(address payable payee, uint256 _amount) external payable
    requireIsOperational
    isCallerAuthorized
    {
        // checks
        require(creditBalances[payee] >= _amount, "Passenger does not have enough credit balance");
        // effects
        creditBalances[payee] = creditBalances[payee].sub(_amount);
        // interaction
        payee.transfer(_amount);
    }

   /**
    * Initial funding for the insurance. Unless there are too many delayed flights
    * resulting in insurance payouts, the contract should be self-sustaining
    * Every registered airline will use this method to send Ether to the data contract to
    * fund the contract.  They can't participate till they fund.  The logic that
    * decides how much ether to send is in the application contract.  If this
    * method receives any funds we assume it's enough to mark the airline as funded.
    * (decouples the logic from the fund storage)
    */
    function fund(address airline) public payable
    requireIsOperational
    isCallerAuthorized
    {
        airlineProfiles[airline].isFunded = true;
    }

    /**
    * Return the address of the owner of this contract (mostly for debugging)
    */
    function getOwner() external view requireContractOwner returns(address owner)
    {
        return contractOwner;
    }

    /**
    * Fallback function for funding smart contract.
    */
    function() external payable
    {
        fund(msg.sender);
    }

}

