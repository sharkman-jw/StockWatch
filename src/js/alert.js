//
// Alerts: price hit, new high, new low, % up, % down
//
function _bindAlertMethods(obj) {
  if (obj.type == 'ph')
    _bindPriceHitAlertMethods(obj);
  else if (obj.type == 'hl')
    _bindHighLowAlertMethods(obj);
}
function _bindAlertData(obj, alertType) {
  obj.type = alertType;
  obj.hitCount = 0;
  obj.hitTime = null; // latest hit time
  obj.fresh = false; // wether to display this hit or not
  obj.timeInForce = 0; // 0 - today (local); 1 - one hit; 2 - persistent
  obj.active = true;
  obj.activateDay = (new Date()).getDate();
  obj.alertId = null;
}



//
// class PriceHitAlert
//
function PriceHitAlert(currentPrice, targetPrice, hitDirection) {
  _bindPriceHitAlertMethods(this);
  _bindPriceHitAlertData(this, currentPrice, targetPrice, hitDirection);
  this.init(currentPrice);
}
function _bindPriceHitAlertMethods(obj) {
  //_bindAlertMethods(obj);
  obj.init = _phaInit;
  obj.check = _phaCheck;
  obj.hitDirectionText = _phaHitDirectionText;
  obj.typeText = _phaTypeText;
  obj.isBearish = _phaIsBearish;
}
function _bindPriceHitAlertData(obj, currentPrice, targetPrice, hitDirection) {
  _bindAlertData(obj, 'ph');
  obj.timeInForce = 1;
  obj.targetPrice = targetPrice;
  obj.hitDirection = hitDirection;
  obj.dummyHits = [];
}
function _phaInit(currentPrice) {
  if (this.hitDirection == 0) { // determine hit direction according to current price
    switch(compareFloat(currentPrice, this.targetPrice)) {
    case -1: // current < target
      this.hitDirection = 1;
      break;
    case 1: // current > target
      this.hitDirection = -1;
      break;
    case 0:
    default:
      this.hitDirection = 0;
      break;
    }
  } else {
    switch(compareFloat(currentPrice, this.targetPrice)) {
    case -1: // current < target
      if (this.hitDirection == -1)
        this.dummyHits.push(1);
      break;
    case 1: // current > target
      if (this.hitDirection == 1)
        this.dummyHits.push(-1);
      break;
    case 0:
    default:
      if (this.hitDirection == 1)
        this.dummyHits.push(-1);
      else if (this.hitDirection == -1)
        this.dummyHits.push(1);
      break;
    }
  }
}
function _phaCheck(stock) {
  if (!this.active)
    return false;
  
  // TODO: move this to background (maybe)
  if (this.timeInForce == 0 && (new Date()).getDate() != this.activateDay) {
    this.active = false;
    return false;
  }
  
  var lastPrice = stock.effectiveLastPriceFloat();
  var compRes = compareFloat(lastPrice, this.targetPrice);
  var hit = false;
  switch (compRes) {
  case -1: // current price < target price
  case 1: // current price > target price
    if (this.dummyHits.length < 1)
      hit = this.hitDir == compRes;
    else if (this.dummyHits[0] == compRes)
      this.dummyHits.shift();
    break;
  case 0:
  default:
    if (this.dummyHits.length < 1) {
      //var lastTick = stock.lastTick == 'u' ? 1 : (stock.lastTick == 'd' ? -1 : 0);
      //hit = lastTick == this.hitDir || this.hitDir == 0;
      hit = true;
    }
    break;
  }
  if (hit) {
    this.ticker = stock.ticker;
    this.hitCount ++;
    this.hitTime = stock.lastTradeTime;
    this.fresh = true;
    this.hitPrice = lastPrice;
    if (this.timeInForce == 1) // one hit
      this.active = false;
  }
  return hit;
}
function _phaHitDirectionText() {
  switch (this.hitDirection) {
  case 1:
    return 'upward hit';
    break;
  case -1:
    return 'downward hit';
    break;
  case 0:
  default:
    return '';
    break;
  }
}
function _phaTypeText() {
  return 'Price Hit';
}
function _phaIsBearish() {
  return this.hitDirection == -1;
}



//------------------------------------------------------------------------------
// class HighLowAlert
//------------------------------------------------------------------------------
function HighLowAlert(benchmarkPrice, hitDirection) {
  _bindHighLowAlertMethods(this);
  _bindHighLowAlertData(this, benchmarkPrice, hitDirection);
  this.init();
}
function _bindHighLowAlertMethods(obj) {
  obj.init = _hlaInit;
  obj.check = _hlaCheck;
  obj.isBearish = _hlaIsBearish;
  obj.typeText = _hlaTypeText;
}
function _bindHighLowAlertData(obj, benchmarkPrice, hitDirection) {
  _bindAlertData(obj, 'hl');
  obj.timeInForce = 0;
  obj.benchmarkPrice = benchmarkPrice;
  obj.hitDirection = hitDirection == 1 ? 1 : -1;
}
function _hlaInit() {
}
function _hlaCheck(stock) {
  if (!this.active)
    return false;
  // TODO: move this to background (maybe)
  if (this.timeInForce == 0 && (new Date()).getDate() != this.activateDay) {
    this.active = false;
    return false;
  }
  var lastPrice = stock.effectiveLastPriceFloat();
  var compRes = compareFloat(lastPrice, this.benchmarkPrice);
  var hit = false;
  switch (compRes) {
  case -1: // last price < benchmark
  case 1: // last price > benchmark
    hit = this.hitDirection == compRes;
    break;
  case 0:
  default:
    break;
  }
  if (hit) {
    this.ticker = stock.ticker;
    this.hitCount ++;
    this.hitTime = stock.lastTradeTime;
    this.fresh = true;
    this.benchmarkPrice = lastPrice; // update benchmark
    if (this.timeInForce == 1) // once hit only
      this.active = false;
  }
  return hit;
}
function _hlaIsBearish() {
  return this.hitDirection == -1;
}
function _hlaTypeText() {
  return this.hitDirection == 1 ? 'Day High' : 'Day Low';
}



//------------------------------------------------------------------------------
// class PercentageAlert
//------------------------------------------------------------------------------
// TODO



//------------------------------------------------------------------------------
// class StockAlerts
//------------------------------------------------------------------------------
var _maxAlertsPerSymbol = 5;
//
function StockAlerts(keyTicker) {
  // methods
  _bindStockAlertsMethods(this);
  // data
  this.keyTicker = keyTicker;
  this.alerts = [];
}
//
function _bindStockAlertsMethods(saObj) {
  saObj.saveToLS = _saSaveToLS;
  saObj.add = _saAdd;
  saObj.at = _saAt;
  saObj.delAt = _saDelAt;
  saObj.clear = _saClear;
  saObj.size = _saSize;
  saObj.check = _saCheck;
  saObj.remove = _saRemove;
}
//
function getStockAlertsFromLS(keyTicker) {
  var obj = getObjFromLS('a_' + keyTicker, null);
  if (obj) {
    _bindStockAlertsMethods(obj);
    for (var i = 0; i < obj.alerts.length; ++ i) {
      _bindAlertMethods(obj.alerts[i]);
    }
  }
  return obj;
}
//
function _saSaveToLS() {
  saveObjToLS('a_' + this.keyTicker, this);
}
//
function _saAdd(al) {
  if (this.alerts.length < _maxAlertsPerSymbol) {
    // fetch an ID for this new alert
    var hash = {};
    for (var i = 0; i < this.alerts.length; ++ i) {
      hash[this.alerts[i].alertId] = '';
    }
    var n = 1;
    while (hash.hasOwnProperty(n)) {
      ++ n;
    }
    al.alertId = n;
    // add
    this.alerts.push(al);
    this.saveToLS();
    return true;
  }
  return false;
}
//
function _saAt(index) {
  if (index >= 0 && index < this.alerts.length)
    return this.alerts[index];
  return null;
}
//
function _saDelAt(i) {
  if (i >= 0 && i < this.alerts.length) {
    this.alerts.splice(i, 1);
    this.saveToLS();
  }
}
//
function _saClear() {
  this.alerts = [];
  this.saveToLS();
}
//
function _saSize() {
  return this.alerts.length;
}
//
function _saCheck(stock) {
  var hits = [];
  for (var i = 0; i <this.alerts.length; ++ i) {
    if (this.alerts[i].check(stock))
      hits.push(this.alerts[i]);
  }
  this.saveToLS();
  return hits;
}
//
function _saRemove() {
  localStorage.removeItem('a_' + this.keyTicker);
}






