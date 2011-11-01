//------------------------------------------------------------------------------
// class Stock
//------------------------------------------------------------------------------
function Stock(rawData, lite) {
  // - rawData: obj parsed from google finance returned JSON data
  // - lite: create lite version of stock obj 
  bindStockMethods(this, lite);
  _initStockDataBasic(this, rawData);
  if (!lite) // false or undefined (default to be evo)
    _initStockDataEvo(this, rawData);
}
//
// non-member functions
//
function bindStockMethods(stock, lite) {
  _bindStockMethodsBasic(stock);
  if (!lite)
    _bindStockMethodsEvo(stock);
}
//
function _initStockDataBasic(stock, rawData) {
  if (!rawData)
    return;
  stock.gId = rawData.id; // google stock id
  stock.ticker = rawData.t;
  stock.exchange = rawData.e;
  stock.last = rawData.l;
  //stock.lastTradeTime = rawData.ltt;
  stock.change = rawData.c;
  stock.percentChange = rawData.cp;
  if (rawData.hasOwnProperty('el')) {
    stock.ext = true;
    stock.extLast = rawData.el;
    stock.extChange = rawData.ec;
    stock.extPercentChange = rawData.ecp;
    // stock's trading status
    // TODO: detect 'close'
    if (stock.exchange == 'NASDAQ' || stock.exchange == 'NYSE' || stock.exchange == 'AMEX') {
      if (rawData.elt.indexOf('PM') != -1)
        stock.status = 'aft-hrs';
      else if (rawData.elt.indexOf('AM') != -1)
        stock.status = 'pre-mkt';
    }
    stock.lastTradeTime = rawData.elt;
  } else {
    stock.ext = false;
    stock.extLast = '';
    stock.extChange = '';
    stock.extPercentChange = '';
    stock.status = ''; // TODO...
    stock.lastTradeTime = rawData.ltt;
  }
  stock.delay = rawData.delay;
  
  // derived data
  stock.keyTicker = _createKeyTickerFromStockObj(stock);
  stock.trend = ''; // trend according to moving average
  stock.lastTick = ''; // last tick: up/down/equal
  stock.priceHTML = ''; // the html code of price, with <span> containing changed part
}
//
function _initStockDataEvo(stock, rawData) {
  stock.name = rawData.name;
  stock.open = rawData.op;
  stock.high = rawData.hi;
  stock.low = rawData.lo;
  stock.vol = rawData.vo;
  stock.avgVol = rawData.avvo;
  stock.high52w = rawData.hi52;
  stock.low52w = rawData.lo52;
  stock.marketCap = rawData.mc;
  stock.pe = rawData.pe;
  stock.beta = rawData.beta;
  stock.eps = rawData.eps;
  stock.type = rawData.type;
}
//
function _bindStockMethodsBasic(stock) {
  // to add: stock.method = _stockMethod;
  
  // calculations
  stock.calcLastTick = _stockCalcLastTick;
  stock.calcTrend = _stockCalcTrend;
  // attributes
  stock.genPriceHTML = _stockGenPriceHTML;
  stock.url = _stockUrl;
  stock.fullTicker = _stockFullTicker;
  stock.lastPriceFloat = _stockLastPriceFloat;
  stock.effectiveLastPriceFloat = _stockEffectiveLastPriceFloat;
  stock.effectiveLastPrice = _stockEffectiveLastPrice;
  stock.effectiveChange = _stockEffectiveChange;
  stock.effectivePercentChange = _stockEffectivePercentChange;
  stock.isIndex = _stockIsIndex;
  // local storage
  stock.saveToLS = _stockSaveToLS;
}
//
function _bindStockMethodsEvo(stock) {
}
//
function _createKeyTickerFromStockObj(stock) {
  // US markets
  //if (stock.exchange == 'NASDAQ' || stock.exchange == 'NYSE' || stock.exchange == 'AMEX')
  //  return stock.ticker;
  // other
  return stock.fullTicker();
}
//
function _createStockLSKeyFromStockKeyTicker(keyTicker) {
  // note: if change the key patten here, places that use this key pattern should
  // be updated, such as data cleanup funtions
  return 'd_' + keyTicker;
}
//
function getStockFromLS(keyTicker) {
  var val = localStorage.getItem(_createStockLSKeyFromStockKeyTicker(keyTicker));
  var obj = val ? JSON.parse(val) : null;
  if (obj)
    bindStockMethods(obj);
  return obj;
}
//
// member functions
//
function _stockIsIndex() {
  return this.exchange.indexOf('INDEX') != -1;
}
//
function _stockSaveToLS() {
  localStorage.setItem(_createStockLSKeyFromStockKeyTicker(this.keyTicker), JSON.stringify(this));
}
//
function _stockFullTicker() {
  return this.exchange + ':' + this.ticker;
}
//
function _stockUrl() {
  return 'http://www.google.com/finance?q=' + this.fullTicker();
}
//
function _stockEffectiveLastPriceFloat() {
  return parseFloat(this.effectiveLastPrice().replace(/,/g, ''));
}
//
function _stockLastPriceFloat() {
  return parseFloat(this.last.replace(/,/g, ''));
}
//
function _stockEffectiveLastPrice() {
  if (this.ext)
    return this.extLast;
  return this.last;
}
//
function _stockEffectiveChange() {
  if (this.ext)
    return this.extChange;
  return this.change;
}
//
function _stockEffectivePercentChange() {
  if (this.ext)
    return this.extPercentChange;
  return this.percentChange;
}
//
function _stockCalcLastTick(previousPrice) {
  var diff = this.effectiveLastPriceFloat() - previousPrice;
  if (diff > 0.0001) // last > 2nd last
    this.lastTick = 'u'; // tick up
  else if (diff < -0.0001) // last < 2nd last
    this.lastTick = 'd'; // tick down
  else // last == 2nd last
    this.lastTick = 'e';
}
//
function _stockCalcTrend(benchmarkPrice) {
  var diff = this.effectiveLastPriceFloat() - benchmarkPrice;
  if (diff > 0.0001) // last > avg
    this.trend = 'u'; // trend up
  else if (diff < -0.0001) // last < avg
    this.trend = 'd'; // trend down
  else // last == avg
    this.trend = 'e';
}
//
function _stockGenPriceHTML(benchmarkPriceStr) {
  var elast = this.effectiveLastPrice();
  if (elast.length == benchmarkPriceStr.length) { // part (or no) changed
    var index = 0;
    while (index < benchmarkPriceStr.length && elast.charAt(index) == benchmarkPriceStr.charAt(index)) {
      ++ index;
    }
    if (index == benchmarkPriceStr.length)
      this.priceHTML = elast; // no change
    else
      this.priceHTML = elast.substr(0, index) + '<span>' + elast.substr(index) + '</span>';
  } else { // fully changed
    this.priceHTML = '<span>' + elast + '</span>';
  }
}



//------------------------------------------------------------------------------
// class RecentQuotes
//------------------------------------------------------------------------------
function RecentQuotes(keyTicker) {
  this.quotes = [];
  this.sum = 0.0;
  this.mostRecent;
  this.keyTicker = keyTicker;
  bindRecentQuotesMethods(this);
}
//
// non-member functions
//
function bindRecentQuotesMethods(recentQuotesObj) {
  recentQuotesObj.addQuote = _rqAddQuote;
  recentQuotesObj.average = _rqAverage;
  recentQuotesObj.saveToLS = _rqSaveToLS;
}
//
function _createRecentQuotesLSKeyFromStockKeyTicker(keyTicker) {
  // note: if change the key patten here, places that use this key pattern should
  // be updated, such as data cleanup funtions
  return 'rq_' + keyTicker;
}
//
function getRecentQuotesFromLS(keyTicker) { 
  return getObjFromLS(_createRecentQuotesLSKeyFromStockKeyTicker(keyTicker),
    null, bindRecentQuotesMethods);
}
//
// member functions
//
function _rqAddQuote(quote, limit) {
  if (this.quotes.length == limit) {
    this.sum -= this.quotes.shift();
  } else if (this.quotes.length > limit) { // after limit was reset to be a smaller value
    var n = this.quotes.length - limit + 1; // number of quotes to remove
    for (var i = 0; i < n; ++ i)
      this.sum -= this.quotes.shift();
  }
  this.quotes.push(quote);
  this.mostRecent = quote;
  this.sum += quote;
}
//
function _rqAverage() {
  return this.sum / this.quotes.length;
}
//
function _rqSaveToLS() {
  localStorage.setItem(_createRecentQuotesLSKeyFromStockKeyTicker(this.keyTicker), JSON.stringify(this));
}
