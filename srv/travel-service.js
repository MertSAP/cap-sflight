const cds = require ('@sap/cds'); require('./workarounds')

class TravelService extends cds.ApplicationService {
init() {

  /**
   * Reflect definitions from the service's CDS model
   */
  const { Travel, Booking, BookingSupplement } = this.entities


  /**
   * Fill in primary keys for new Travels.
   * Note: In contrast to Bookings and BookingSupplements that has to happen
   * upon SAVE, as multiple users could create new Travels concurrently.
   */
  this.before ('CREATE', 'Travel', async req => {
    const { maxID } = await SELECT.one `max(TravelID) as maxID` .from (Travel)
    req.data.TravelID = maxID + 1
  })


  /**
   * Fill in defaults for new Bookings when editing Travels.
   */
  this.before ('NEW', 'Booking.drafts', async (req) => {
    const { to_Travel_TravelUUID } = req.data
    const { status } = await SELECT `TravelStatus_code as status` .from (Travel.drafts, to_Travel_TravelUUID)
    if (status === 'X') throw req.reject (400, 'Cannot add new bookings to rejected travels.')
    const { maxID } = await SELECT.one `max(BookingID) as maxID` .from (Booking.drafts) .where ({to_Travel_TravelUUID})
    req.data.BookingID = maxID + 1
    req.data.BookingStatus_code = 'N'
    req.data.BookingDate = (new Date).toISOString().slice(0,10) // today
  })


  /**
   * Fill in defaults for new BookingSupplements when editing Travels.
   */
  this.before ('NEW', 'BookingSupplement.drafts', async (req) => {
    const { to_Booking_BookingUUID } = req.data
    const { maxID } = await SELECT.one `max(BookingSupplementID) as maxID` .from (BookingSupplement.drafts) .where ({to_Booking_BookingUUID})
    req.data.BookingSupplementID = maxID + 1
  })


  /**
   * Changing Booking Fees is only allowed for not yet accapted Travels.
   */
  this.before ('UPDATE', 'Travel.drafts', async (req) => { if ('BookingFee' in req.data) {
    const { status } = await SELECT.one `TravelStatus_code as status` .from (req.subject)
    if (status === 'A') req.reject(400, 'Booking fee can not be updated for accepted travels.', 'BookingFee')
  }})


  /**
   * Update the Travel's TotalPrice when its BookingFee is modified.
   */
  this.after ('UPDATE', 'Travel.drafts', (_,req) => { if ('BookingFee' in req.data) {
    return this._update_totals4 (req.data.TravelUUID)
  }})


  /**
   * Update the Travel's TotalPrice when a Booking's FlightPrice is modified.
   */
  this.after ('UPDATE', 'Booking.drafts', async (_,req) => { if ('FlightPrice' in req.data) {
    // We need to fetch the Travel's UUID for the given Booking target
    const { travel } = await SELECT.one `to_Travel_TravelUUID as travel` .from (req.subject)
    return this._update_totals4 (travel)
  }})


  /**
   * Update the Travel's TotalPrice when a Supplement's Price is modified.
   */
  this.after ('UPDATE', 'BookingSupplement.drafts', async (_,req) => { if ('Price' in req.data) {
    // We need to fetch the Travel's UUID for the given Supplement target
    const { travel } = await SELECT.one `to_Travel_TravelUUID as travel` .from (Booking.drafts)
      .where `BookingUUID = ${ SELECT.one `to_Booking_BookingUUID` .from (BookingSupplement.drafts).where({BookSupplUUID:req.data.BookSupplUUID}) }`
      // .where `BookingUUID = ${ SELECT.one `to_Booking_BookingUUID` .from (req.subject) }`
      //> REVISIT: req.subject not supported for subselects -> see tests
    return this._update_totals4 (travel)
  }})

  /**
   * Update the Travel's TotalPrice when a Booking Supplement is deleted.
   */
  this.on('CANCEL', BookingSupplement.drafts, async (req, next) => {
    // Find out which travel is affected before the delete
    const { BookSupplUUID } = req.data
    const { to_Travel_TravelUUID } = await SELECT.one
      .from(BookingSupplement.drafts, ['to_Travel_TravelUUID'])
      .where({ BookSupplUUID })
    // Delete handled by generic handlers
    const res = await next()
    // After the delete, update the totals
    await this._update_totals4(to_Travel_TravelUUID)
    return res
  })

  /**
   * Update the Travel's TotalPrice when a Booking is deleted.
   */
  this.on('CANCEL', Booking.drafts, async (req, next) => {
    // Find out which travel is affected before the delete
    const { BookingUUID } = req.data
    const { to_Travel_TravelUUID } = await SELECT.one
      .from(Booking.drafts, ['to_Travel_TravelUUID'])
      .where({ BookingUUID })
    // Delete handled by generic handlers
    const res = await next()
    // After the delete, update the totals
    await this._update_totals4(to_Travel_TravelUUID)
    return res
  })


  /**
   * Helper to re-calculate a Travel's TotalPrice from BookingFees, FlightPrices and Supplement Prices.
   */
  this._update_totals4 = function (travel) {
    // Using plain native SQL for such complex queries
    return cds.run(`UPDATE ${Travel.drafts} SET
      TotalPrice = coalesce(BookingFee,0)
      + ( SELECT coalesce (sum(FlightPrice),0) from ${Booking.drafts} where to_Travel_TravelUUID = TravelUUID )
      + ( SELECT coalesce (sum(Price),0) from ${BookingSupplement.drafts} where to_Travel_TravelUUID = TravelUUID )
    WHERE TravelUUID = ?`, [travel])
  }


  /**
   * Validate a Travel's edited data before save.
   */
  this.before ('SAVE', 'Travel', req => {
   //Code removed as it is replaced by CAPVAL plugin. See annotations in db/validations.cds
  })


  //
  // Action Implementations...
  //

  this.on ('acceptTravel', req => UPDATE (req.subject) .with ({TravelStatus_code:'A'}))
  this.on ('rejectTravel', req => UPDATE (req.subject) .with ({TravelStatus_code:'X'}))
  this.on ('deductDiscount', async req => {
    let discount = req.data.percent / 100
    let succeeded = await UPDATE (req.subject)
      .where `TravelStatus_code != 'A'`
      .and `BookingFee is not null`
      .with (`
        TotalPrice = round (TotalPrice - BookingFee * ${discount}, 3),
        BookingFee = round (BookingFee - BookingFee * ${discount}, 3)
      `)
    if (!succeeded) { //> let's find out why...
      let travel = await SELECT.one `TravelID as ID, TravelStatus_code as status, BookingFee` .from (req.subject)
      if (!travel) throw req.reject (404, `Travel "${travel.ID}" does not exist; may have been deleted meanwhile.`)
      if (travel.status === 'A') req.reject (400, `Travel "${travel.ID}" has been approved already.`)
      if (travel.BookingFee == null) throw req.reject (404, `No discount possible, as travel "${travel.ID}" does not yet have a booking fee added.`)
    } else {
      return this.read(req.subject)
    }
  })


  // Add base class's handlers. Handlers registered above go first.
  return super.init()

}}
module.exports = {TravelService}
