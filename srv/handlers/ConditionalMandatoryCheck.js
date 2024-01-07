const BaseValidation = require('capval')
module.exports = class ConditionalMandatoryCheck extends BaseValidation {
    isValid(InputValue) {
       var data = this.getDataToRoot();

       if(data['Travel-TravelStatus_code'] === 'X') return true;
        if(!InputValue) {
            this.setMessage("i18n>" + this.getField()+ '-errorMessage'); 
           
            return false;
        }
        return true;
    }

    
}