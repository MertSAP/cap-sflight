using { sap.fe.cap.travel as schema } from '../db/schema';

//
// annotations that control rendering of fields and labels
//

annotate schema.Travel {
    @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/BeginDateChecks.js'
    }
    BeginDate;
     @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
    BookingFee;
    @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
    EndDate;
    @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
    to_Agency;
    @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
    to_Customer
}

annotate schema.Booking {
     @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
    ConnectionID;
     @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
    FlightDate;
     @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
    FlightPrice;
     @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
    BookingStatus;
   
    to_Carrier;
     @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
    to_Customer
}

annotate schema.BookingSupplement {
     @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
Price;
     @validation: {
        message: 'Default Message',
        handler: 'srv/handlers/ConditionalMandatoryCheck.js'
    }
to_Supplement
}

