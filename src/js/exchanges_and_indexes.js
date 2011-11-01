//------------------------------------------------------------------------------
// Exchanges
//------------------------------------------------------------------------------
var _exchInfo = { 
  // NA
  NYSE: 'New York Stock Exchange',
  NASDAQ: 'The NASDAQ Stock Market',
  AMEX: 'American Stock Exchange',
  OTC: 'FINRA OTC Bulletin Board',
  PINK: 'FINRA OTC Bulletin Board',
  TSE: 'Toronto Stock Exchange',
  CVE: 'Toronto TSX Ventures Exchange',
  //OPRA: 'Option Chains',
  // EU
  LON: 'London Stock Exchange',
  FRA: 'Deutsche Borse Frankfurt',
  ETR: 'Deutsche Borse XETRA',
  BIT: 'Borsa Italiana Milan',
  EPA: 'NYSE Euronext Paris',
  EBR: 'NYSE Euronext Brussels',
  ELI: 'NYSE Euronext Lisbon',
  AMS: 'NYSE Euronext Amsterdam',
  // Asia
  BOM: 'Bombay Stock Exchange',
  NSE: 'National Exchange of India',
  SHA: 'Shanghai Stock Exchange',
  SHE: 'Shenzhen Stock Exchange',
  TPE: 'Taiwan Stock Exchange',
  HKG: 'Hong Kong Stock Exchange',
  TYO: 'Tokyo Stock Exchange',
  // South Pacific
  ASX: 'Australian Stock Exchange',
  NZE: 'New Zealand Stock Exchange'
};
var _exchPostfixMapping = { // from yahoo symbol postfix to google exch code
  // North America
  PK: 'PINK',
  OB: 'OTC',
  TO: 'TSE',
  IR: 'ISE',
  // Euro
  L: 'LON',
  F: 'FRA',
  DE: 'ETR',
  MI: 'BIT',
  PA: 'EPA',
  BR: 'EBR',
  LS: 'ELI',
  AS: 'AMS',
  // Asia
  BO: 'BOM',
  NS: 'NSE',
  SS: 'SHA',
  SZ: 'SHE',
  TW: 'TPE',
  HK: 'HKG',
  // No japan??
  // South pacific
  AX: 'ASX',
  NZ: 'NZE'
};
var _exchMapping = { // from yahoo finance to google finance
  // NA
  PCX: 'NYSE', // Pacific Exchange, now part of NYSEArca
  NYQ: 'NYSE',
  NMS: 'NASDAQ',
  ASE: 'AMEX',
  OBB: 'OTC',
  PNK: 'PINK',
  TOR: 'TSE',
  //CVE: 'CVE', no yahoo code
  //OPRA: 'OPRA', no yahoo code
  // EU
  LSE: 'LON',
  FRA: 'FRA',
  GER: 'ETR',
  MIL: 'BIT',
  PAR: 'EPA',
  BRU: 'EBR',
  LIS: 'ELI',
  AMS: 'AMS',
  // Asia
  BSE: 'BOM',
  NSI: 'NSE',
  SHH: 'SHA',
  SHZ: 'SHE',
  TAI: 'TPE',
  HKG: 'HKG',
  TYO: 'TYO',
  // South Pacific
  ASX: 'ASX',
  NZE: 'NZE'
};
// Get all exchange codes in a list
function getExchangesCodes() {
  var codes = [];
  for (each in _exchInfo) {
    codes.push(each);
  }
  return codes;
}
//
function getExchangesInfo() {
  return _exchInfo;
}
//
function getMarketsCodes() { // with region groups
  var excludes = { NYSE: '', NASDAQ: '', AMEX: '', OTC: '', PINK: '', SHA: '', SHE: ''};
  var markets = ['USA', 'PRC'];
  for (each in _exchInfo) {
    if (!excludes.hasOwnProperty(each))
      markets.push(each);
  }
  return markets;
}
//
function getMarketsNames() { // with region groups
  var excludes = { NYSE: '', NASDAQ: '', AMEX: '', OTC: '', PINK: '', SHA: '', SHE: ''};
  var markets = ['U.S. Markets (NYSE, NASDAQ, AMEX..)', 'China (P.R.) Markets (SHA, SHE)'];
  for (each in _exchInfo) {
    if (!excludes.hasOwnProperty(each))
      markets.push(_exchInfo[each] + ' (' + each + ')');
  }
  return markets;
}
//
function convertYahooExchCode(yahooExchCode, yahooExchDisplay) {
  if (_exchInfo.hasOwnProperty(yahooExchDisplay)) // NASDAQ, NYSE, AMEX ...
    return yahooExchDisplay;
  if (_exchMapping.hasOwnProperty(yahooExchCode))
    return _exchMapping[yahooExchCode];
  return '';
}
//
function convertYahooSymbol(yahooSymbol, exchCode /* google exch code */) {
  var index = yahooSymbol.indexOf('.');
  if (index != -1) {
    var exchPostfix = yahooSymbol.substr(index + 1);
    if (_exchPostfixMapping[exchPostfix] == exchCode)
      return yahooSymbol.substr(0, index);
  }
  return yahooSymbol;
}



//------------------------------------------------------------------------------
// Indexes
//------------------------------------------------------------------------------
function Index(region, regionCode, googleTicker, yahooTicker, name, display) {
  // data
  this.region = region;
  this.regionCode = regionCode;
  this.gticker = googleTicker;
  this.yticker = yahooTicker;
  this.name = name;
  this.disp = display;
}
//
function createIndex(region, regionCode, googleTicker, yahooTicker, name, display) {
  return new Index(region, regionCode, googleTicker, yahooTicker, name, display);
}
//
var _indexesInfo = null;
var _indexesByRegions = null;
var _indexMappingY2G = null;
//
function getIndexes() {
  if (_indexesInfo)
    return _indexesInfo;
  var hash = {};
  var index = null;
  //index = createIndex('Argentina', '', '^MERV', '', '');
  index = createIndex('Australia', 'au', 'INDEXASX:XAO', '^AORD', 'All Ordinaries', 'All Ordinaries');
  hash[index.gticker] = index;
  //index = createIndex('Austria', 'GTICKER', '^ATX', 'NAME', 'DISP');
  //index = createIndex('Belgium', 'GTICKER', '^BFX', 'NAME', 'DISP');
  //index = createIndex('Brazil', 'GTICKER', '^BVSP', 'NAME', 'DISP');
  index = createIndex('Canada', 'ca', 'TSE:OSPTX', '^GSPTSE', 'S&P/TSX Composite index', 'S&P TSX');
  hash[index.gticker] = index;
  //index = createIndex('Chile', 'GTICKER', '^IPSA', 'NAME', 'DISP');
  index = createIndex('China, People\'s Republic', 'cn', 'SHA:000001', '000001.SS', 'SSE Composite Index', 'Shanghai');
  hash[index.gticker] = index;
  index = createIndex('China, People\'s Republic', 'cn', 'SHE:399001', '399001.SZ', 'SZSE Component Index', 'Shenzhen 40');
  hash[index.gticker] = index;
  index = createIndex('China, Republic of', 'tw', 'TPE:TAIEX', '^TWII', 'TSEC Weighted Index', 'TSEC');
  hash[index.gticker] = index;
  index = createIndex('Denmark', 'dk', 'INDEXDJX:DKDOW', '^DKDOW', 'Dow Jones Denmark Index', 'DK Dow');
  hash[index.gticker] = index;
  index = createIndex('EU', 'eu', 'INDEXSTOXX:SX5E', '^STOXX50E', 'Euro Stoxx 50', 'EU Stoxx 50');
  hash[index.gticker] = index;
  index = createIndex('France', 'fr', 'INDEXEURO:PX1', '^FCHI', 'CAC 40', 'CAC 40');
  hash[index.gticker] = index;
  index = createIndex('Germany', 'de', 'INDEXDB:DAX', '^GDAXI', 'Deutscher Aktien IndeX (DAX)', 'DAX');
  hash[index.gticker] = index;
  index = createIndex('Hong Kong', 'hk', 'INDEXHANGSENG:HSI', '^HSI', 'Hang Seng Index', 'Hang Seng');
  hash[index.gticker] = index;
  index = createIndex('India', 'in', 'INDEXBOM:SENSEX', '^BSESN', 'BSE Sensex', 'BSE Sensex');
  hash[index.gticker] = index;
  index = createIndex('India', 'in', 'NSE:NIFTY', '^NSEI', 'S&P CNX Nifty', 'Nifty 50');
  hash[index.gticker] = index;
  //index = createIndex('Indonesia', 'GTICKER', '^JKSE', 'NAME', 'DISP');
  //index = createIndex('Ireland', 'GTICKER', '^ISEQ,^IETP', 'NAME', 'DISP');
  //index = createIndex('Israel', 'GTICKER', '^TA100', 'NAME', 'DISP');
  index = createIndex('Italy', 'it', 'INDEXFTSE:FTSEMIBN', 'FTSEMIB.MI', 'FTSE MIB', 'FTSE MIB');
  hash[index.gticker] = index;
  index = createIndex('Japan', 'jp', 'INDEXNIKKEI:NI225', '^N225', 'Nikkei 225', 'Nikkei 225');
  hash[index.gticker] = index;
  //index = createIndex('Korea', 'GTICKER', '^KS11', 'NAME', 'DISP');
  index = createIndex('Malaysia', 'my', 'INDEXFTSE:FBMKLCI', '^KLSE', 'FTSE Bursa Malaysia KLCI', 'FTSE BM');
  hash[index.gticker] = index;
  //index = createIndex('Mexico', 'GTICKER', '^MXX', 'NAME', 'DISP');
  index = createIndex('Netherlands', 'nl', 'INDEXDJX:NLDOW', '^NLDOW', 'Dow Jones Netherlands Index', 'NL Dow');
  hash[index.gticker] = index;
  index = createIndex('Netherlands', 'nl', 'INDEXEURO:AEX', '^AEX', 'Amsterdam Exchange Index (AEX)', 'AEX');
  hash[index.gticker] = index;
  index = createIndex('New Zealand', 'nz', 'NZE:NZ50G', '^NZ50', 'NZX 50 Index Gross', 'NZX 50 G');
  hash[index.gticker] = index;
  index = createIndex('Norway', 'no', 'INDEXDJX:NODOW', '^NODOW', 'Dow Jones Norway Index', 'NO Dow');
  hash[index.gticker] = index;
  //index = createIndex('Philippines', 'GTICKER', 'PSEI.PS', 'NAME', 'DISP');
  //index = createIndex('Portugal', 'GTICKER', '^PSI20', 'NAME', 'DISP');
  //index = createIndex('Singapore', 'GTICKER', '^STI', 'NAME', 'DISP');
  //index = createIndex('Spain', 'GTICKER', '^IBEX', 'NAME', 'DISP');
  //index = createIndex('Sri Lanka', 'GTICKER', '^CSE', 'NAME', 'DISP');
  //index = createIndex('Sweden', 'GTICKER', '^OMXSPI', 'NAME', 'DISP');
  //index = createIndex('Switzerland', 'GTICKER', '^SSMI,^STOXX50E', 'NAME', 'DISP');
  index = createIndex('United Kingdom', 'gb', 'INDEXFTSE:UKX', '^FTSE', 'FTSE 100', 'FTSE 100');
  hash[index.gticker] = index;
  index = createIndex('United States', 'us', 'INDEXDJX:.DJI', '^DJI', 'Dow Jones Industrial Average', 'DJIA');
  hash[index.gticker] = index;
  index = createIndex('United States', 'us', 'INDEXSP:.INX', '^GSPC', 'S&P 500 Index', 'S&P 500');
  hash[index.gticker] = index;
  index = createIndex('United States', 'us', 'INDEXNASDAQ:.IXIC', '^IXIC', 'NASDAQ Composite', 'NASDAQ');
  hash[index.gticker] = index;
  //index = createIndex('United States', 'INDEXNASDAQ:.NDX', '^NDX', 'NASDAQ-100', 'NASDAQ 100'); not now
  _indexesInfo = hash;
  return _indexesInfo;
}
//
function getIndexMappingY2G() {
  if (_indexMappingY2G)
    return _indexMappingY2G;
  var _indexMappingY2G = {};
  var indexes = getIndexes();
  for (gticker in indexes) {
    _indexMappingY2G[indexes[gticker].yticker] = gticker;
  }
  return _indexMappingY2G;
}
//
function getIndexesByRegions() {
  if (_indexesByRegions)
    return _indexesByRegions;
  var info = getIndexes();
  var hash = {};
  var index = null;
  for (each in info) {
    index = info[each];
    if (hash.hasOwnProperty(index.regionCode))
      hash[index.regionCode].push(index);
    else
      hash[index.regionCode] = [index];
  }
  _indexesByRegions = hash;
  return _indexesByRegions;
}

