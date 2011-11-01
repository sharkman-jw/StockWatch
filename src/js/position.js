//------------------------------------------------------------------------------
// class Transaction
//------------------------------------------------------------------------------
function Transaction(keyTicker, direction, price, shares, commission) {
  // methods
  _bindTransactionMethods(this);
  // data
  this.keyTicker = keyTicker;
  this.price = 0.0;
  this.shares = 0;
  this.direction = 'b';
  this.commission = 0.0;
  
  this.init(direction, price, shares, commission);
}
//
// non-member function
//
function _bindTransactionMethods(transObj) {
  transObj.init = _transInit;
  transObj.setPrice = _transSetPrice;
  transObj.setShares = _transSetShares;
  transObj.setDirection = _transSetDirection;
  transObj.setCommission = _transSetCommission;
  transObj.validateNumericVal = _transValidateNumericVal;
  transObj.validateDirection = _transValidateDirection;
}
//
function validateTransaction(transObj) {
  return transObj.validateDirection(transObj.direction) &&
    transObj.validateNumericVal(transObj.price) &&
    transObj.validateNumericVal(transObj.commission) &&
    transObj.validateNumericVal(transObj.shares);
}
//
// "member" functions
//
function _transInit(direction, price, shares, commission) {
  this.setDirection(direction);
  this.setPrice(price);
  this.setShares(shares);
  this.setCommission(commission);
}
//
function _transValidateNumericVal(numericVal) {
  return (numericVal && typeof(numericVal) == 'number' && numericVal > 0.0);
}
//
function _transValidateDirection(direction) {
  return direction == 'b' || direction == 's';
}
//
function _transSetPrice(price) {
  if (this.validateNumericVal(price)) {
    this.price = price;
    return true;
  }
  return false;
}
//
function _transSetShares(shares) {
  if (this.validateNumericVal(shares)) {
    this.shares = shares;
    return true;
  }
  return false;
}
//
function _transSetCommission(commission) {
  if (this.validateNumericVal(commission)) {
    this.commission = commission;
    return true;
  }
  return false;
}
//
function _transSetDirection(direction) {
  this.direction = (direction == 'b' || direction == 'B') ? 'b' : 's';
}



//------------------------------------------------------------------------------
// class Position
//------------------------------------------------------------------------------
function Position(keyTicker) {
  // methods
  _bindPositionMethods(this);
  // data
  this.keyTicker = keyTicker;
  this.quantity = 0;
  this.lastPrice = 0.0;
  this.marketValue = 0.0;
  this.costBasis = 0.0;
  this.costTotal = 0.0;
  this.transactions = [];
  
  this.quantityDisplay = '';
  this.marketValueDisplay = '';
  this.costBasisDisplay = '';
  this.costTotalDisplay = '';
}
//
// non-member functions
//
function _bindPositionMethods(posObj) {
  posObj.addTransaction = _posAddTransaction;
  posObj.updatePrice = _posUpdatePrice;
  posObj.markToMarket = _posMarkToMarket;
  posObj.saveToLS = _posSaveToLS;
  posObj.destory = _posDestory;
  posObj.recalc = _posRecalc;
}
//
function _getPositionFromLS(keyTicker) {
  var text = localStorage.getItem('pos_' + keyTicker);
  if (text) {
    var pos = JSON.parse(text);
    _bindPositionMethods(pos);
    
    for (var i = 0; i < pos.transactions.length; ++ i)
      _bindTransactionMethods(pos.transactions[i]);
    
    return pos;
  }
  return null;
}
//
// member functions
//
function _posAddTransaction(trans) {
  if (!trans || this.keyTicker != trans.keyTicker || !validateTransaction(trans))
    return false;
  
  this.transactions.push(trans);
  this.recalc();
  return true;
}
//
function _posRecalc() {
  this.quantity = 0;
  this.costBasis = 0.0;
  this.costTotal = 0.0;
  
  var t = null;
  var qty = 0;
  var marVal = 0.0;
  for (var i = 0; i < this.transactions.length; ++ i) {
    t = this.transactions[i];
    if (t.direction == 'b')
      qty = t.shares;
    else
      qty = -t.shares;
    marVal = qty * t.price;
    
    this.quantity += qty;
    this.costTotal += marVal + t.commission;
    this.costBasis += marVal;
  }
  this.costBasisDisplay = formatNumber(this.costBasis, 100000, 2);
  this.costTotalDisplay = formatNumber(this.costTotal, 100000, 2);
  this.quantityDisplay = formatNumber(this.quantity, 1000000, 1, 0);
  
  this.markToMarket();
  this.saveToLS();
}
//
function _posUpdatePrice(price) {
  if (price && typeof(price) == 'number' && price > 0.0) {
    this.lastPrice = price;
    this.markToMarket();
    this.saveToLS();
    return true;
  }
  return false;
}
//
function _posMarkToMarket() {
  this.marketValue = this.lastPrice * this.quantity;
  this.marketValueDisplay = formatNumber(this.marketValue, 100000.0, 2);
  this.saveToLS();
}
//
function _posSaveToLS() {
  localStorage.setItem('pos_' + this.keyTicker, JSON.stringify(this));
}
//
function _posDestory() {
  localStorage.removeItem('pos_' + this.keyTicker);
}



//------------------------------------------------------------------------------
// class PositionManager
//------------------------------------------------------------------------------
function PositionManager() {
  // methods
  _bindPositionManagerMethods(this);
  // data
  this.positions = [];
}
//
// non-member functions
//
function _bindPositionManagerMethods(pmObj) {
  pmObj.saveToLS = _pmSaveToLS;
  pmObj.getPosition = _pmGetPosition;
  pmObj.addPosition = _pmAddPosition;
  pmObj.delPosition = _pmDelPosition;
  pmObj.addTransaction = _pmAddTransaction;
}
//
function getPositionManagerFromLS() {
  var text = localStorage.getItem('_position_manager');
  if (text) {
    pm = JSON.parse(text);
    _bindPositionManagerMethods(pm);
    return pm;
  }
  return null;
}
//
// member functions
//
function _pmGetPosition(keyTicker) {
  return this.positions.indexOf(keyTicker) == -1 ? null : _getPositionFromLS(keyTicker);
}
//
function _pmAddPosition(keyTicker) {
  if (this.positions.indexOf(keyTicker) == -1) {
    this.positions.push(keyTicker);
    this.saveToLS();
    
    var pos = new Position(keyTicker);
    pos.saveToLS();
    return pos;
  }
  return null;
}//
function _pmDelPosition(keyTicker) {
  var pos = this.getPosition(keyTicker);
  if (!pos)
    return;
  this.positions.splice(this.positions.indexOf(keyTicker), 1);
  pos.destory();
  this.saveToLS();
}
//
function _pmAddTransaction(trans) {
  var pos = this.getPosition(trans.keyTicker);
  if (!pos) 
    pos = this.addPosition(trans.keyTicker);
  pos.addTransaction(trans);
}
//
function _pmSaveToLS() {
  localStorage.setItem('_position_manager', JSON.stringify(this));
}



//------------------------------------------------------------------------------
// Format numbers
//------------------------------------------------------------------------------
function formatNumber(num, formatingThreshold, decimalsFormated, decimalsNonFormated) {
  var absNum = Math.abs(num);
  if (absNum < formatingThreshold) {
    return num.toFixed(decimalsNonFormated || decimalsNonFormated == 0 ? decimalsNonFormated : decimalsFormated);
  }
  var unit = 1000.0;
  var unitSymbol = 'k';
  if (absNum > 1000000000.0) { // use b
    unit = 1000000000.0;
    unitSymbol = 'b';
  } else if (absNum > 1000000.0) { // use m
    unit = 1000000.0;
    unitSymbol = 'm';
  }
  var numInUnits = num / unit;
  return numInUnits.toFixed(decimalsFormated) + unitSymbol;
}


