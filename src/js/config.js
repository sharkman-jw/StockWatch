//------------------------------------------------------------------------------
// class Config
//------------------------------------------------------------------------------
function Config(keyword, defaultVal) {
  _bindConfigMethods(this);
  _initConfigData(this, keyword, defaultVal);
}
//
function _initConfigData(configObj, keyword, defaultVal) {
  configObj.lsKey = _createLSKeyFromConfigKeyword(keyword); // localStorage key
  configObj.defaultVal = defaultVal;
  configObj.setValue(defaultVal);
  configObj.type = '';
}
//
function _bindConfigMethods(configObj) {
  configObj.saveToLS = _configSaveToLS;
  configObj.destory = _configDestory;
  configObj.setValue = _configSetValue;
  configObj.getValue = _configGetValue;
  configObj.getKeyword = _configGetKeyword;
}
//
function _createLSKeyFromConfigKeyword(keyword) {
  return '_' + keyword.replace(/\s/g, '_').toLowerCase();
}
//
// member functions
//
function _configGetKeyword() {
  return this.lsKey.substr(1);
}
//
function _configSaveToLS() {
  saveObjToLS(this.lsKey, this);
}
//
function _configDestory() {
  localStorage.removeItem(this.lsKey);
}
//
function _configSetValue(value) {
  this.val = value;
}
//
function _configGetValue() {
  return this.val;
}



//------------------------------------------------------------------------------
// class BooleanConfig - "derived" from Config
//------------------------------------------------------------------------------
function BooleanConfig(keyword, defaultVal) {
  _bindBooleanConfigMethods(this);
  _initConfigData(this, keyword, defaultVal);
  this.defaultVal = defaultVal ? 1 : 0;
  this.type = 'bool';
}
//
function _bindBooleanConfigMethods(configObj) {
  _bindConfigMethods(configObj);
  configObj.setValue = _boolConfigSetValue;
}
//
function _boolConfigSetValue(value) {
  this.val = value ? 1 : 0;
}



//------------------------------------------------------------------------------
// class OptionConfig - "derived" from Config
//------------------------------------------------------------------------------
function OptionConfig(keyword, options, defaultVal) {
  // - options: a list of options, such as ['option1', 'option2']
  
  // methods
  _bindOptionConfigMethods(this);
  // data
  this.options = options;
  this.optionDisps = [];
  _initConfigData(this, keyword, defaultVal);
  if (!this.validateValue(this.defaultVal)) {
    this.defaultVal = this.options.length == 0 ? null : this.options[0];
    this.val = this.defaultVal;
    this.valIndex = this.options.length == 0 ? -1 : 0;
  }
  this.type = 'option';
}
//
function _bindOptionConfigMethods(configObj) {
  _bindConfigMethods(configObj);
  configObj.setValue = _optConfigSetValue;
  configObj.setValueByIndex = _optConfigSetValueByIndex;
  configObj.getValueAtIndex = _optConfigGetValueAtIndex;
  configObj.validateValue = _optConfigValidateValue;
  configObj.getOptionDisplays = _optGetOptionDisplays;
  configObj.setOptionDisplays = _optSetOptionDisplays;
}
//
function _optSetOptionDisplays(disps) {
  if (disps.length != this.options.length)
    return;
  this.optionDisps = disps;
  this.saveToLS();
}
//
function _optGetOptionDisplays() {
  if (this.optionDisps && this.optionDisps.length > 0)
    return this.optionDisps;
  // TODO: remove the following part in 2.0
  if (this.optionDisps != []) { // for previous version when there was no such property...
    this.optionDisps = [];
    this.saveToLS();
  }
  return this.options; // default
}
//
function _optConfigValidateValue(value) {
  if (!value)
    value = this.value;
  return this.options.indexOf(value) != -1;
}
//
function _optConfigSetValueByIndex(index) {
  if (index >= 0 && index < this.options.length) {
    this.val = this.options[index];
    this.valIndex = index;
  }
}
//
function _optConfigSetValue(value) {
  if (this.validateValue(value)) {
    this.val = value;
    this.valIndex = this.options.indexOf(this.val);
  }
}
//
function _optConfigGetValueAtIndex(index) {
  if (index >= 0 && index < this.options.length)
    return this.options[index];
}



//
// "static" functions
//
function getConfig(keyword) { // "staitc" method
  var obj = getObjFromLS(_createLSKeyFromConfigKeyword(keyword), null);
  if (obj) {
    if (obj.type == 'option')
      _bindOptionConfigMethods(obj);
    else if (obj.type == 'bool')
      _bindBooleanConfigMethods(obj);
    else
      _bindConfigMethods(obj);
  }
  return obj;
}
//
function initConfig(keyword, defaultValue, reset) { // set config is not exists
  var config = getConfig(keyword);
  if (config) {
    if (reset) {
      config.destory();
      config = new Config(keyword, defaultValue);
      config.saveToLS();
    }
  } else {
    config = new Config(keyword, defaultValue);
    config.saveToLS();
  }
  return config;
}
//
function initBooleanConfig(keyword, defaultValue, reset) {
  var config = getConfig(keyword);
  if (config) {
    if (reset) {
      config.destory();
      config = new BooleanConfig(keyword, defaultValue);
      config.saveToLS();
    }
  } else {
    config = new BooleanConfig(keyword, defaultValue);
    config.saveToLS();
  }
  return config;
}
//
function initOptionConfig(keyword, options, defaultValue, reset) {
  var config = getConfig(keyword);
  if (config) {
    if (reset) {
      var preVal = config.getValue();
      config.destory();
      config = new OptionConfig(keyword, options, defaultValue);
      if (config.validateValue(preVal))
        config.setValue(preVal);
      config.saveToLS();
    }
  } else {
    config = new OptionConfig(keyword, options, defaultValue);
    config.saveToLS();
  }
  return config;
}

