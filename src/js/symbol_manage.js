//------------------------------------------------------------------------------
// class SymbolList - a list containing unique stock symbols
//------------------------------------------------------------------------------
function SymbolList(listName, listId, limit) {
  // methods
  _bindSymbolListMethods(this);
  // data
  this.listId = listId;
  this.name = listName;
  this.limit = limit;
  this.symbols = [];
  this.visible = true;
  this.enable = true; // if disabled, the corresponding stock data won't be refreshed on backend
  // TODO: add starred symbols
}
//
function _bindSymbolListMethods(slObj) {
  slObj.at = _slAt;
  slObj.saveToLS = _slSaveToLS;
  slObj.add = _slAdd;
  slObj.shiftAdd = _slShiftAdd;
  slObj.del = _slDel;
  slObj.indexOf = _slIndexOf;
  slObj.size = _symboListSize;
  slObj.clear = _slClear;
  slObj.setVisible = _slSetVisible;
  slObj.setLimit = _slSetLimit;
  slObj.setEnable = _slSetEnable;
  
  slObj.renameSymbol = _slRenameSymbol; // TODO: delete this method in the future
}
//
function getSymbolListFromLS(listId) {
  return getObjFromLS(listId, null, _bindSymbolListMethods);
}
//
// member functions
//
function _slRenameSymbol(oldSymbol, newSymbol) {
  var index = this.symbols.indexOf(oldSymbol);
  if (index != -1) {
    this.symbols[index] = newSymbol;
    this.saveToLS();
  }
}
//
function _slSetEnable(enable) {
  if (this.enable == enable)
    return;
  this.enable = enable ? true : false;
  this.saveToLS();
}
//
function _slSetLimit(limit) {
  if (this.limit != limit && typeof(limit) == 'number') {
    this.limit = limit;
    this.saveToLS();
  }  
}
function _slSetVisible(visible) {
  if (this.visible != visible) {
    this.visible = visible ? true: false;
    this.saveToLS();
  }
}
function _slAt(index) {
  return (index >= 0 && index < this.symbols.length) ? this.symbols[index] : null;
}
//
function _slClear() {
  this.symbols = [];
  this.saveToLS();
}
//
function _symboListSize() {
  return this.symbols.length;
}
//
function _slSaveToLS() {
  if (this.listId)
    localStorage.setItem(this.listId, JSON.stringify(this));
}
//
function _slAdd(symbol, shiftOldestIfFull) {
  if (this.symbols.indexOf(symbol) != -1)
    return false;
  
  if (this.symbols.length >= this.limit) // reached capacity
    return false;

  this.symbols.push(symbol);
  this.saveToLS();
  return true;
}
//
function _slShiftAdd(symbol) {
  var index = this.symbols.indexOf(symbol);
  if (index == -1) {
    if (this.symbols.length == this.limit) // reached capacity
      this.symbols.shift();
    else if (this.symbols.length > this.limit) // unlikely.. but just in case
      this.symbols.splice(0, this.symbols.length - this.limit + 1);
  } else {
    this.symbols.splice(index, 1);
  }
  this.symbols.push(symbol);
  this.saveToLS();
  return true;
}
//
function _slDel(symbol) {
  var index = this.symbols.indexOf(symbol);
  if (index != -1) {
    this.symbols.splice(index, 1);
    this.saveToLS();
  }
}
//
function _slIndexOf(symbol) {
  return this.symbols.indexOf(symbol);
}



//------------------------------------------------------------------------------
// class SymbolListManager ("Singleton-like")
//------------------------------------------------------------------------------
function SymbolListManager() {
  // methods
  this.createList = _slmCreateList;
  this.deleteListById = _slmDeleteListById;
  this.getListById = _slmGetListById;
  this.getListByIndex = _slmGetListByIndex;
  this.saveToLS = _slmSaveToLS;
  this.loadFromLS = _slmLoadFromLS;
  this.size = _slmSize;
  this.getAllSymbolsHash = _slmGetAllSymbolsHash;
  this.getCurrentList = _slmGetCurrentList;
  this.setCurrentList = _slmSetCurrentList;
  // data
  this.lists = []; // ids of symbol lists
  this.limit = 7;
  this.currentList = '';
  this.currentWatchList = '';
}
//
function getSymbolListManagerFromLS() { // "Singleton-like"
  var slm = new SymbolListManager();
  slm.loadFromLS();
  return slm;
}
//
// member methods
//
function _slmSetCurrentList(listId) {
  if (this.lists.indexOf(listId) == -1)
    return false;
  this.currentList = listId;
  this.saveToLS();
  return true;
}
//
function _slmGetCurrentList() {
  return this.currentList ? this.getListById(this.currentList) : null;
}
//
function _slmSaveToLS() {
  localStorage.setItem('_symbol_lists', JSON.stringify(this));
  var symbolList = null;
  for (var i = 0; i < this.lists.length; ++ i) {
    listId = this.lists[i];
    if (listId) {
      symbolList = this.getListById(listId);
      if (symbolList)
        symbolList.saveToLS();
    }
  }
}
//
function _slmLoadFromLS() {
  // retrieve
  var val = localStorage.getItem('_symbol_lists', null);
  var obj = val ? JSON.parse(val) : null;
  if (obj) {
    this.lists = obj.lists;
    this.currentList = obj.currentList;
  }
  // fill up if needed
  while (this.lists.length < this.limit) {
    this.lists.push('');
  }
  // validate
  var listId = '';
  for (var i = 0; i < this.lists.length; ++ i) {
    listId = this.lists[i];
    if (listId && !localStorage.getItem(listId))
      this.lists[i] = '';
  }
}
//
function _slmGetListById(listId) {
  if (this.lists.indexOf(listId) == -1)
    return null;
  var sl = null;
  var val = localStorage.getItem(listId);
  if (val) {
    sl = JSON.parse(val);
    _bindSymbolListMethods(sl);
    // TODO: for upgrade from 2nd release, remove it for the 4th release
    if (!sl.hasOwnProperty('enable'))
      sl.setEnable(true); 
    if (!sl.hasOwnProperty('visible'))  
      sl.setVisible(true);
  }
  else
    this.deleteListById(listId);
  return sl;
}
//
function _slmGetListByIndex(index) {
  if (index < 0 || index >= this.lists.length)
    return null;
  return this.getListById(this.lists[index]);
}
//
function _slmCreateList(listName, listId, limit) { // listId is optional
  // find slot
  var i = 0;
  for (i = 0; i < this.limit; ++ i) {
    if (!this.lists[i])
      break;
  }
  if (i == this.limit) // no available slots left
    return null;
  // validate listId if provided
  if (listId) {
    if (this.lists.indexOf(listId) != -1)
      return null; // already used
  } else {
    listId = 'sl_' + i;
  }
  // add
  this.lists[i] = listId;
  // create new list and save
  var newList = new SymbolList(listName, listId, limit);
  newList.saveToLS();
  return newList;
}
//
function _slmDeleteListById(listId) {
  var index = this.lists.indexOf(listId);
  if (-1 == index)
    return;
  // clear
  this.lists[index] = '';
  localStorage.removeItem(listId);
}
//
function _slmSize() {
  var n = 0;
  for (var i = 0; i < this.limit; ++ i) {
    if (this.lists[i])
      n ++;
  }
  return n;
}
//
function _slmGetAllSymbolsHash() {
  var listId = '';
  var symbolList = null;
  var j = 0;
  var hash = {};
  var symbol = '';
  var invalidSymbols = [];
  for (var i = 0; i < this.lists.length; ++ i) {
    listId = this.lists[i];
    if (listId) {
      symbolList = this.getListById(listId);
      if (symbolList && symbolList.visible && symbolList.enable) {
        invalidSymbols = [];
        for (j = 0; j < symbolList.symbols.length; ++ j) {
          symbol = symbolList.symbols[j];
          if (symbol)
            hash[symbol] = '';
          else
            invalidSymbols.push(symbol);
        }
        for (j = 0; j < invalidSymbols.length; ++ j) // clean up if neccessary
          symbolList.del(invalidSymbols[j]);
      }
    }
  }
  return hash;
}
