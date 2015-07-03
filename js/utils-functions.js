window.mapUtils = {};
var mapUtils = window.mapUtils;
mapUtils = {
    http: {
        json: function(url, data, callback) {
            
            // Must encode data
            if(data && typeof(data) === 'object') {
                var y = '', e = encodeURIComponent;
                for (x in data) {
                    y += '&' + e(x) + '=' + e(data[x]);
                }
                data = y.slice(1);
            }
            
            url += (/\?/.test(url) ? '&' : '?') + data;
            
            var xmlHttp = new(XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
            xmlHttp.open("GET", url, true);
            xmlHttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xmlHttp.setRequestHeader("Accept","application/json");
            xmlHttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState != 4) return;
                if (xmlHttp.status != 200 && xmlHttp.status != 304){
                    callback('');
                    return;
                }
                callback(JSON.parse(xmlHttp.response));
            };
            xmlHttp.send(null);
        }
    },
    panTo: function(map, coord, duration){
        duration = duration || 500;
        var pan = ol.animation.pan({
                duration: duration,
                source: map.getView().getCenter()
            });
        
        map.beforeRender(pan);
        map.getView().setCenter(coord);
    },
    to3857: function(coord){
        return ol.proj.transform(
            [parseFloat(coord[0]), parseFloat(coord[1])], 'EPSG:4326', 'EPSG:3857'
        );
    },
    to4326: function(coord){
        return ol.proj.transform(
            [parseFloat(coord[0]), parseFloat(coord[1])], 'EPSG:3857', 'EPSG:4326'
        );
    },
    createElement: function(node, html){
        var frag = document.createDocumentFragment();
        
        var elem = document.createElement(node);
        elem.innerHTML = html;
        
        while (elem.childNodes[0]) {
            frag.appendChild(elem.childNodes[0]);
        }
        elem.appendChild(frag);
        return elem;
    },
    htmlEscape: function(str){
        return String(str).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },
    hasClass: function(element, classname){
        return element.className.split(/\s/).indexOf(classname) != -1;
    },
    addClass: function(element, classname){
        var 
            rspaces = /\s+/, c,
            classNames = (classname || "").split(rspaces),
            className = " " + element.className + " ",
            setClass = element.className;
        
        for (c = 0; c < classNames.length; c++) {
            if (className.indexOf(" " + classNames[c] + " ") < 0)
                setClass += " " + classNames[c];
        }
        element.className = setClass.replace(/^\s+|\s+$/g,'');
    },
    removeClass: function(element, classname){
        var
            rspaces = /\s+/, c, rclass = /[\n\t]/g,
            classNames = (classname || "").split(rspaces),
            className = (" " + element.className + " ").replace(rclass, " ");
        
        for (c = 0; c < classNames.length; c++) {
            className = className.replace(" " + classNames[c] + " ", " ");
        }
        element.className = className.replace(/^\s+|\s+$/g,'');
    },
    /**
     * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
     * @param obj1
     * @param obj2
     * @returns obj3 a new object based on obj1 and obj2
     */
    mergeOptions: function(obj1, obj2){
        var obj3 = {};
        for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
        return obj3;
    }
};

function $el(id){
    return document.getElementById(id);
}
function transformCoordToMercator(x, y){
    var lon, lat;
    if(x instanceof Array){
        lon = x[0], lat = x[1];
    } else {
        lon = x, lat = y;
    }
    return ol.proj.transform([parseFloat(lon), parseFloat(lat)], 'EPSG:4326', 'EPSG:3857');
}
function to3857(x, y){
    //an alias to transformCoordToMercator
    return transformCoordToMercator(x, y);
}
function to4326(x, y){
    var lon, lat;
    if(x instanceof Array){
        lon = x[0], lat = x[1];
    } else {
        lon = x, lat = y;
    }
    return ol.proj.transform([parseFloat(lon), parseFloat(lat)], 'EPSG:3857', 'EPSG:4326');
}
function rotate(xCoord, yCoord, angle, length) {
    length = (typeof length !== 'undefined') ? length : 10;
    angle = angle * Math.PI / 180; // if you're using degrees instead of radians
    return [
        length * Math.cos(angle) + xCoord, 
        length * Math.sin(angle) + yCoord
    ];
}

function createCoord(coord, bearing, distance){
    /** http://www.movable-type.co.uk/scripts/latlong.html
     φ is latitude, λ is longitude, 
     θ is the bearing (clockwise from north), 
     δ is the angular distance d/R; 
     d being the distance travelled, R the earth’s radius*
     **/
    
    var 
        radius = 6371e3, //meters
        δ = Number(distance) / radius, // angular distance in radians
        θ = Number(bearing).toRad();
        φ1 = coord[1].toRad(),
        λ1 = coord[0].toRad();
    
    var φ2 = Math.asin(Math.sin(φ1)*Math.cos(δ) + Math.cos(φ1)*Math.sin(δ)*Math.cos(θ));
    
    var λ2 = λ1 + Math.atan2(Math.sin(θ)*Math.sin(δ)*Math.cos(φ1), Math.cos(δ)-Math.sin(φ1)*Math.sin(φ2));
    
    λ2 = (λ2+3*Math.PI) % (2*Math.PI) - Math.PI; // normalise to -180..+180°
    
    return [λ2.toDeg(), φ2.toDeg()]; //[lon, lat]
}
function getCoordMidPoint(start, end){
    //assumption - start, end [lon, lat] EPSG:4326
    
    var
        φ1 = start[1].toRad(), λ1 = start[0].toRad(),
        φ2 = end[1].toRad(),
        Δλ = (end[0] - start[0]).toRad(),
        Bx = Math.cos(φ2) * Math.cos(Δλ),
        By = Math.cos(φ2) * Math.sin(Δλ);
    
    var φ3 = Math.atan2(Math.sin(φ1)+Math.sin(φ2),
                Math.sqrt((Math.cos(φ1)+Bx)*(Math.cos(φ1)+Bx) + By*By));
    var λ3 = λ1 + Math.atan2(By, Math.cos(φ1) + Bx);
    
    λ3 = (λ3+3*Math.PI) % (2*Math.PI) - Math.PI; // normalise to -180..+180°
    
    return [λ3.toDeg(), φ3.toDeg()]; //[lon, lat]
}

var isOdd = function(x) { return x & 1; }; //impar
var isEven  = function(x) { return !( x & 1 ); };
Number.prototype.toDeg = function() { return this * 180 / Math.PI; }
Number.prototype.toRad = function() { return this * Math.PI / 180; }
function toDeg(x) {return x * 180 / Math.PI;}
function toRad(x) {return x * Math.PI / 180;}
var π = Math.PI;

function compareCoordinates(coord1, coord2){
    //assumption: coord - array type - [lon, lat]
    
    var rounded1 = coord1.map(function(val){
        return round(val, 1);
    }),
    rounded2 = coord2.map(function(val){
        return round(val, 1);
    });
    
    return (rounded1.join('') == rounded2.join('')) ? true : false;
}
function compareString(strA, strB){
    var result;
    for(result = 0, i = strA.length; i--;){
        if(typeof strB[i] == 'undefined' || strA[i] == strB[i]);
        else if(strA[i].toLowerCase() == strB[i].toLowerCase())
            result++;
        else
            result += 4;
    }
    return 1 - (result + 4*Math.abs(strA.length - strB.length))/(2*(strA.length+strB.length));
}
function calculaDistanciaRota(inicio, fim){
    //console.log(inicio[0]);
    //pressuposto inicio = [lon, lat] EPSG:4326
    var lat1 = parseFloat(inicio[1]),
        lon1 = parseFloat(inicio[0]),
        lat2 = parseFloat(fim[1]),
        lon2 = parseFloat(fim[0]);
        
    var distance = SphericalCosinus(lat1, lon1, lat2, lon2);
    return round(distance, 1);
}


function SphericalCosinus(lat1, lon1, lat2, lon2) {
    //console.log(lat1, lon1, lat2, lon2);
    var R = 6371; // km
    var dLon = toRad(lon2 - lon1),
        lat1 = toRad(lat1),
        lat2 = toRad(lat2),
        d = Math.acos(Math.sin(lat1)*Math.sin(lat2) + Math.cos(lat1)*Math.cos(lat2) * Math.cos(dLon)) * R;
    
    return round(d, 3);
}

function round(value, exp) {
    if (typeof exp === 'undefined' || +exp === 0)
        return Math.round(value);
    
    value = +value;
    exp  = +exp;
    
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
        return NaN;
    
    // Shift
    value = value.toString().split('e');
    value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));
    
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
}

function decompress (encoded, precision) {
    precision = Math.pow(10, -precision);
    var len = encoded.length, index=0, lat=0, lng = 0, array = [];
    while (index < len) {
        var b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        array.push(lat * precision);
        array.push(lng * precision);
    }
    return array;
}

function radians(n) {
    return n * (Math.PI / 180);
}
function degrees(n) {
    return n * (180 / Math.PI);
}

// convert radians to degrees
function radToDeg(rad) {
    return rad * 360 / (π * 2);
}
// convert degrees to radians
function degToRad(deg) {
    return deg * π * 2 / 360;
}

function getBearing(start, end){
    //assumption [lon, lat] EPSG:4326
    
    var
        startLat = toRad(start[1]),
        startLong = toRad(start[0]),
        endLat = toRad(end[1]),
        endLong = toRad(end[0]),
        dLong = endLong - startLong;
    
    var dPhi = Math.log(Math.tan(endLat/2.0+Math.PI/4.0)/Math.tan(startLat/2.0+Math.PI/4.0));
    if (Math.abs(dLong) > Math.PI){
        if (dLong > 0.0)
            dLong = -(2.0 * Math.PI - dLong);
        else
            dLong = (2.0 * Math.PI + dLong);
    }
    
    return (toDeg(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
}
function findDuplicates(arr) {
    var i,
    len=arr.length,
    out=[],
    obj={};
    
    for (i=0;i<len;i++) {
        if (obj[arr[i]] != null) {
            if (!obj[arr[i]]) {
                out.push(arr[i]);
                obj[arr[i]] = 1;
            }
        } else {
            obj[arr[i]] = 0;                        
        }
    }
    return out;
}
function myIndexOf(o) {    
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].x == o.x && arr[i].y == o.y) {
            return i;
        }
    }
    return -1;
}
function uniq_fast(a) {
    var seen = {};
    var out = [];
    var len = a.length;
    var j = 0;
    for(var i = 0; i < len; i++) {
        var item = a[i];
        if(seen[item] !== 1) {
            seen[item] = 1;
            out[j++] = item;
        }
    }
    return out;
}
function eliminateDuplicates(arr) {
    var i,
    len=arr.length,
    out=[],
    obj={};
    
    for (i=0;i<len;i++) {
        obj[arr[i]]=0;
    }
    for (i in obj) {
        out.push(i);
    }
    return out;
}
function arrayUnique(array){
    //[[1,1], [1,2], [1,1]]
    
    var dataUnique = array.reduce(function (out, item) {
        return out.concat(out.filter(function (comp) {
            return item.toString() == comp.toString();
        }).length ? [] : [item])
    }, []);
    
    return dataUnique;
}
function arrayGetDuplicate(myArray){
    var result = [];
    var frequency = myArray.reduce(function(seen, currentItem) {
        if (currentItem in seen) {
            seen[currentItem] = seen[currentItem] + 1;
        } else {
            seen[currentItem] = 1;
        }
        return seen;
    }, {});
    
    for (var key in frequency) {
        if (frequency[key] > 1) {
            result.push(key.split(",").map(function(currentItem) {
                return parseInt(currentItem);
            }));
        }
    }
    return result;
}
function number_format(number, decimals, dec_point, thousands_sep) {
    //  discuss at: http://phpjs.org/functions/number_format/
    // original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // improved by: davook
    // improved by: Brett Zamir (http://brett-zamir.me)
    // improved by: Brett Zamir (http://brett-zamir.me)
    // improved by: Theriault
    // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // bugfixed by: Michael White (http://getsprink.com)
    // bugfixed by: Benjamin Lupton
    // bugfixed by: Allan Jensen (http://www.winternet.no)
    // bugfixed by: Howard Yeend
    // bugfixed by: Diogo Resende
    // bugfixed by: Rival
    // bugfixed by: Brett Zamir (http://brett-zamir.me)
    //  revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    //  revised by: Luke Smith (http://lucassmith.name)
    //    input by: Kheang Hok Chin (http://www.distantia.ca/)
    //    input by: Jay Klehr
    //    input by: Amir Habibi (http://www.residence-mixte.com/)
    //    input by: Amirouche
    //   example 1: number_format(1234.56);
    //   returns 1: '1,235'
    //   example 2: number_format(1234.56, 2, ',', ' ');
    //   returns 2: '1 234,56'
    //   example 3: number_format(1234.5678, 2, '.', '');
    //   returns 3: '1234.57'
    //   example 4: number_format(67, 2, ',', '.');
    //   returns 4: '67,00'
    //   example 5: number_format(1000);
    //   returns 5: '1,000'
    //   example 6: number_format(67.311, 2);
    //   returns 6: '67.31'
    //   example 7: number_format(1000.55, 1);
    //   returns 7: '1,000.6'
    //   example 8: number_format(67000, 5, ',', '.');
    //   returns 8: '67.000,00000'
    //   example 9: number_format(0.9, 0);
    //   returns 9: '1'
    //  example 10: number_format('1.20', 2);
    //  returns 10: '1.20'
    //  example 11: number_format('1.20', 4);
    //  returns 11: '1.2000'
    //  example 12: number_format('1.2000', 3);
    //  returns 12: '1.200'
    //  example 13: number_format('1 000,50', 2, '.', ' ');
    //  returns 13: '100 050.00'
    //  example 14: number_format(1e-8, 8, '.', '');
    //  returns 14: '0.00000001'
    
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + (Math.round(n * k) / k)
            .toFixed(prec);
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n))
    .split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}
if (!('contains' in String.prototype)) {
    String.prototype.contains = function(str, startIndex) {
        return ''.indexOf.call(this, str, startIndex) !== -1;
    };
}