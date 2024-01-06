const BaseValidation = require('capval')
module.exports = class BeginDateChecks extends BaseValidation {
  isValid (InputValue) {
    const travel = this.getNode()
    const today = (new Date()).toISOString().slice(0, 10)

    if (!travel.BeginDate) {
      this.seti18nMessage('BeginDate-errorMessage')
      return false
    }

    if (travel.BeginDate > travel.EndDate) {
      this.seti18nMessage('beginenddate-errorMessage')
      return false
    }

    if (travel.BeginDate < today) {
      this.seti18nMessage('begindatetoday-errorMessage')
      this.setCustomMessageVariables({ today })
      return false
    }

    return true
  }
}
