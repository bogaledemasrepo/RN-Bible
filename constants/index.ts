
export const pageCurlShader = `
  uniform shader fromImg;
  uniform shader toImg;
  uniform float2 resolution;
  uniform float progress;
  uniform float topFlag;   // 1.0: top, 0.0: bottom

  const float MIN_AMOUNT = -0.26;
  const float MAX_AMOUNT = 1.15;
  const float PI = 3.141592653589793;
  const float scale = 512.0;
  const float sharpness = 3.0;

  float2 mapUV(float2 uv){ return (topFlag < 0.5) ? float2(uv.x, 1.0 - uv.y) : uv; }
  float2 geomUV(float2 uv){ return (topFlag < 0.5) ? float2(uv.x, 1.0 - uv.y) : uv; }

  float4 getFromColor(float2 p){ return fromImg.eval(mapUV(p) * resolution); }
  float4 getToColor  (float2 p){ return toImg.eval  (mapUV(p) * resolution); }

  float3 hitPoint(float hitAngle, float yc, float3 point, float3x3 rrotation){
    float hit = hitAngle / (2.0 * PI);
    point.y = hit;
    return float3(rrotation * point);
  }

  float4 antiAlias(float4 c1, float4 c2, float distanc){
    distanc *= scale;
    if (distanc < 0.0) return c2;
    if (distanc > 2.0) return c1;
    float dd = pow(1.0 - distanc / 2.0, sharpness);
    return ((c2 - c1) * dd) + c1;
  }

  float distanceToEdge(float3 point){
    float dx = abs(point.x > 0.5 ? 1.0 - point.x : point.x);
    float dy = abs(point.y > 0.5 ? 1.0 - point.y : point.y);
    if (point.x < 0.0) dx = -point.x;
    if (point.x > 1.0) dx = point.x - 1.0;
    if (point.y < 0.0) dy = -point.y;
    if (point.y > 1.0) dy = point.y - 1.0;
    if ((point.x < 0.0 || point.x > 1.0) && (point.y < 0.0 || point.y > 1.0)) return sqrt(dx*dx+dy*dy);
    return min(dx, dy);
  }

  float4 seeThrough(float yc, float2 p, float3x3 rotation, float3x3 rrotation, float cylinderAngle, float cylinderRadius){
    float hitAngle = PI - (acos(yc / cylinderRadius) - cylinderAngle);
    float3 point = hitPoint(hitAngle, yc, rotation * float3(p,1.0), rrotation);
    if (yc <= 0.0 && (point.x<0.0||point.y<0.0||point.x>1.0||point.y>1.0)) return getToColor(p);
    if (yc > 0.0) return getFromColor(p);
    float4 color = getFromColor(point.xy);
    return antiAlias(color, float4(0.0), distanceToEdge(point));
  }

  float4 seeThroughWithShadow(float yc, float2 p, float3 point, float3x3 rotation, float3x3 rrotation, float cylinderAngle, float cylinderRadius, float amount){
    float shadow = (1.0 - distanceToEdge(point) * 30.0) / 3.0;
    if (shadow < 0.0) shadow = 0.0; else shadow *= amount;
    float4 sc = seeThrough(yc, p, rotation, rrotation, cylinderAngle, cylinderRadius);
    sc.rgb -= shadow;
    return sc;
  }

  float4 backside(float yc, float3 point){
    float4 color = getFromColor(point.xy);
    float gray = (color.r + color.g + color.b) / 15.0;
    gray += 0.8 * (pow(1.0 - abs(yc / (1.0/PI/2.0)), 0.2) * 0.5 + 0.5);
    color.rgb = float3(gray);
    return color;
  }

  float4 behindSurface(float2 p, float yc, float3 point, float3x3 rrotation, float cylinderAngle, float cylinderRadius, float amount){
    float shado = (1.0 - ((-cylinderRadius - yc) / amount * 7.0)) / 6.0;
    shado *= 1.0 - abs(point.x - 0.5);
    yc = (-cylinderRadius - cylinderRadius - yc);
    float hitAngle = (acos(yc / cylinderRadius) + cylinderAngle) - PI;
    point = hitPoint(hitAngle, yc, point, rrotation);
    if (yc < 0.0 && point.x>=0.0 && point.y>=0.0 && point.x<=1.0 && point.y<=1.0 && (hitAngle < PI || amount > 0.5)){
      shado = 1.0 - (sqrt((point.x-0.5)*(point.x-0.5) + (point.y-0.5)*(point.y-0.5)) / 0.71);
      shado *= pow(-yc / cylinderRadius, 3.0) * 0.5;
    } else {
      shado = 0.0;
    }
    float3 base = getToColor(p).rgb;
    return float4(base - shado, 1.0);
  }

  float4 main(float2 xy){
    float2 uv = xy / resolution;
    float2 p = geomUV(uv);

    float amount = progress * (MAX_AMOUNT - MIN_AMOUNT) + MIN_AMOUNT;
    float cylinderCenter = amount;
    float cylinderAngle = 2.0 * PI * amount;
    float cylinderRadius = 1.0 / PI / 2.0;

    float angle = 100.0 * PI / 180.0;
    float c = cos(-angle), s = sin(-angle);
    float3x3 rotation = float3x3( c, s, 0.0, -s, c, 0.0, -0.801, 0.8900, 1.0 );
    c = cos(angle); s = sin(angle);
    float3x3 rrotation = float3x3( c, s, 0.0, -s, c, 0.0, 0.98500, 0.985, 1.0 );

    float3 point = rotation * float3(p, 1.0);
    float yc = point.y - cylinderCenter;

    if (yc < -cylinderRadius) return behindSurface(p, yc, point, rrotation, cylinderAngle, cylinderRadius, amount);
    if (yc >  cylinderRadius)  return getFromColor(p);

    float hitAngle = (acos(yc / cylinderRadius) + cylinderAngle) - PI;
    float hitAngleMod = mod(hitAngle, 2.0 * PI);
    if ((hitAngleMod > PI && amount < 0.5) || (hitAngleMod > PI/2.0 && amount < 0.0)) {
      return seeThrough(yc, p, rotation, rrotation, cylinderAngle, cylinderRadius);
    }

    point = hitPoint(hitAngle, yc, point, rrotation);
    if (point.x<0.0||point.y<0.0||point.x>1.0||point.y>1.0) {
      return seeThroughWithShadow(yc, p, point, rotation, rrotation, cylinderAngle, cylinderRadius, amount);
    }

    float4 color = backside(yc, point);
    float4 otherColor = (yc < 0.0)
      ? float4(0.0, 0.0, 0.0, (1.0 - (sqrt((point.x-0.5)*(point.x-0.5)+(point.y-0.5)*(point.y-0.5)) / 0.71)) * pow(-yc / cylinderRadius,3.0) * 0.5 )
      : getFromColor(p);

    color = antiAlias(color, otherColor, cylinderRadius - abs(yc));
    float4 cl = seeThroughWithShadow(yc, p, point, rotation, rrotation, cylinderAngle, cylinderRadius, amount);
    float dist = distanceToEdge(point);
    return antiAlias(color, cl, dist);
  }
`

export const books = [{"book_id": 1, "name_am": "ኦሪት ዘፍጥረት", "name_en": "Genesis", "short_name_am": "ዘፍ", "short_name_en": "Gen", "testament": "old", "total_chapters": 106}, {"book_id": 2, "name_am": "ኦሪት ዘጸአት", "name_en": "Exodus", "short_name_am": "ዘፀ", "short_name_en": "Ex", "testament": "old", "total_chapters": 105}, {"book_id": 3, "name_am": "ኦሪት ዘሌዋውያን", "name_en": "Leviticus", "short_name_am": "ዘሌ", "short_name_en": "Lev", "testament": "old", "total_chapters": 50}, {"book_id": 4, "name_am": "ኦሪት ዘኍልቍ", "name_en": "Numbers", "short_name_am": "ዘኍ", "short_name_en": "Num", "testament": "old", "total_chapters": 85}, {"book_id": 5, "name_am": "ኦሪት ዘዳግም", "name_en": "Deuteronomy", "short_name_am": "ዘዳ", "short_name_en": "Deut", "testament": "old", "total_chapters": 84}, {"book_id": 6, "name_am": "መጽሐፈ ኢያሱ", "name_en": "Joshua", "short_name_am": "ኢያ", "short_name_en": "Josh", "testament": "old", "total_chapters": 50}, {"book_id": 7, "name_am": "መጽሐፈ መሳፍንት", "name_en": "Judges", "short_name_am": "መሳ", "short_name_en": "Judg", "testament": "old", "total_chapters": 44}, {"book_id": 8, "name_am": "መጽሐፈ ሩት", "name_en": "Ruth", "short_name_am": "ሩት", "short_name_en": "Ruth", "testament": "old", "total_chapters": 4}, {"book_id": 9, "name_am": "መጽሐፈ ሳሙኤል ቀዳማዊ", "name_en": "1 Samuel", "short_name_am": "1 ሳሙ", "short_name_en": "1 Sam", "testament": "old", "total_chapters": 50}, {"book_id": 10, "name_am": "መጽሐፈ ሳሙኤል ካልዕ", "name_en": "2 Samuel", "short_name_am": "2 ሳሙ", "short_name_en": "2 Sam", "testament": "old", "total_chapters": 43}, {"book_id": 11, "name_am": "መጽሐፈ ነገሥት ቀዳማዊ", "name_en": "1 Kings", "short_name_am": "1 ነገ", "short_name_en": "1 Kings", "testament": "old", "total_chapters": 44}, {"book_id": 12, "name_am": "መጽሐፈ ነገሥት ካልዕ", "name_en": "2 Kings", "short_name_am": "2 ነገ", "short_name_en": "2 Kings", "testament": "old", "total_chapters": 52}, {"book_id": 13, "name_am": "መጽሐፈ ዜና መዋዕል ቀዳማዊ", "name_en": "1 Chronicles", "short_name_am": "1 ዜመ", "short_name_en": "1 Chron", "testament": "old", "total_chapters": 45}, {"book_id": 14, "name_am": "መጽሐፈ ዜና መዋዕል ካልዕ", "name_en": "2 Chronicles", "short_name_am": "2 መዜ", "short_name_en": "2 Chron", "testament": "old", "total_chapters": 46}, {"book_id": 15, "name_am": "መጽሐፈ ኩፋሌ", "name_en": "Jubilees", "short_name_am": "ኩፋ", "short_name_en": "Jubil", "testament": "old", "total_chapters": 34}, {"book_id": 16, "name_am": "መጽሐፈ ሄኖክ", "name_en": "Enoch", "short_name_am": "ሄኖ", "short_name_en": "Enoch", "testament": "old", "total_chapters": 42}, {"book_id": 17, "name_am": "መጽሐፈ ዕዝራ", "name_en": "Ezra", "short_name_am": "ዕዝ", "short_name_en": "Ezr", "testament": "old", "total_chapters": 14}, {"book_id": 18, "name_am": "መጽሐፈ ነሐምያ", "name_en": "Nehemiah", "short_name_am": "ነህ", "short_name_en": "Neh", "testament": "old", "total_chapters": 18}, {"book_id": 19, "name_am": "መጽሐፈ ዕዝራ ሱቱኤል", "name_en": "3 Book of Ezra", "short_name_am": "ዕዝ ሱቱ", "short_name_en": "3 Ezr", "testament": "old", "total_chapters": 32}, {"book_id": 20, "name_am": "መጽሐፈ ዕዝራ ካልእ", "name_en": "4 Book of Ezra", "short_name_am": "ዕዝ ካል", "short_name_en": "4 Ezr", "testament": "old", "total_chapters": 31}, {"book_id": 21, "name_am": "መጽሐፈ ጦቢት", "name_en": "Book of Tobit", "short_name_am": "ጦቢ", "short_name_en": "tobit", "testament": "old", "total_chapters": 25}, {"book_id": 22, "name_am": "መጽሐፈ ዮዲት", "name_en": "Book of Judith", "short_name_am": "ዮዲ", "short_name_en": "Judith", "testament": "old", "total_chapters": 25}, {"book_id": 23, "name_am": "መጽሐፈ አስቴር", "name_en": "Esther", "short_name_am": "አስ", "short_name_en": "Est", "testament": "old", "total_chapters": 20}, {"book_id": 24, "name_am": "መጽሐፈ መቃብያን ቀዳማዊ", "name_en": "1 Meqabyan", "short_name_am": "1 መቃ", "short_name_en": "1 Meqa", "testament": "old", "total_chapters": 36}, {"book_id": 25, "name_am": "መጽሐፈ መቃብያን ካልእ", "name_en": "2 Meqabyan", "short_name_am": "2 መቃ", "short_name_en": "2 Meqa", "testament": "old", "total_chapters": 21}, {"book_id": 26, "name_am": "መጽሐፈ መቃብያን ሳልስ", "name_en": "3 Meqabyan", "short_name_am": "3 መቃ", "short_name_en": "3 Meqa", "testament": "old", "total_chapters": 10}, {"book_id": 27, "name_am": "መጽሐፈ ኢዮብ", "name_en": "Job", "short_name_am": "ኢዮብ", "short_name_en": "Job", "testament": "old", "total_chapters": 48}, {"book_id": 28, "name_am": "መዝሙረ ዳዊት", "name_en": "Psalms", "short_name_am": "መዝ", "short_name_en": "Ps", "testament": "old", "total_chapters": 175}, {"book_id": 29, "name_am": "መጽሐፈ ምሳሌ", "name_en": "Proverbs", "short_name_am": "ምሳ", "short_name_en": "Prov", "testament": "old", "total_chapters": 28}, {"book_id": 30, "name_am": "መጽሐፈ ተግሣጽ", "name_en": "Book of Admonition", "short_name_am": "ተግ", "short_name_en": "admo", "testament": "old", "total_chapters": 6}, {"book_id": 31, "name_am": "መጽሐፈ ጥበብ", "name_en": "Wisdom of Solomon", "short_name_am": "ጥበ", "short_name_en": "wos", "testament": "old", "total_chapters": 43}, {"book_id": 32, "name_am": "መጽሐፈ መክብብ", "name_en": "Ecclesiastes", "short_name_am": "መክ", "short_name_en": "Ecc", "testament": "old", "total_chapters": 15}, {"book_id": 33, "name_am": "ማሕልየ መሓልይ ዘሰሎሞን", "name_en": "Song of Solomon", "short_name_am": "መሓ", "short_name_en": "Song", "testament": "old", "total_chapters": 8}, {"book_id": 34, "name_am": "መጽሐፈ ሲራክ", "name_en": "book of sirach", "short_name_am": "ሲራ", "short_name_en": "sir", "testament": "old", "total_chapters": 100}, {"book_id": 35, "name_am": "ትንቢተ ኢሳይያስ", "name_en": "Isaiah", "short_name_am": "ኢሳ", "short_name_en": "Isa", "testament": "old", "total_chapters": 87}, {"book_id": 36, "name_am": "ትንቢተ ኤርምያስ", "name_en": "Jeremiah", "short_name_am": "ኤር", "short_name_en": "Jer", "testament": "old", "total_chapters": 93}, {"book_id": 37, "name_am": "መጽሐፈ ባሮክ", "name_en": "Baruch", "short_name_am": "ባሮክ", "short_name_en": "Baru", "testament": "old", "total_chapters": 9}, {"book_id": 38, "name_am": "ሰቆቃወ ኤርምያስ", "name_en": "Lamentations", "short_name_am": "ሰኤ", "short_name_en": "Lam", "testament": "old", "total_chapters": 6}, {"book_id": 39, "name_am": "ተረፈ ኤርምያስ", "name_en": "Teref Ermias", "short_name_am": "ተረኤር", "short_name_en": "teer", "testament": "old", "total_chapters": 1}, {"book_id": 40, "name_am": "ተረፈ ባሮክ", "name_en": "Teref Baruch", "short_name_am": "ተባ", "short_name_en": "TBar", "testament": "old", "total_chapters": 5}, {"book_id": 41, "name_am": "ትንቢተ ሕዝቅኤል", "name_en": "Ezekiel", "short_name_am": "ሕዝ", "short_name_en": "Ezek", "testament": "old", "total_chapters": 74}, {"book_id": 42, "name_am": "ትንቢተ ዳንኤል", "name_en": "Daniel", "short_name_am": "ዳን", "short_name_en": "Dan", "testament": "old", "total_chapters": 27}, {"book_id": 43, "name_am": "ትንቢተ ሆሴዕ", "name_en": "Hosea", "short_name_am": "ሆሴ", "short_name_en": "Hos", "testament": "old", "total_chapters": 19}, {"book_id": 44, "name_am": "ትንቢተ ዓሞጽ", "name_en": "Amos", "short_name_am": "ዓሞ", "short_name_en": "Amos", "testament": "old", "total_chapters": 24}, {"book_id": 45, "name_am": "ትንቢተ ሚክያስ", "name_en": "Micah", "short_name_am": "ሚክ", "short_name_en": "Micah", "testament": "old", "total_chapters": 7}, {"book_id": 46, "name_am": "ትንቢተ ኢዮኤል", "name_en": "Joel", "short_name_am": "ኢዮ", "short_name_en": "Joel", "testament": "old", "total_chapters": 3}, {"book_id": 47, "name_am": "ትንቢተ አብድዩ", "name_en": "Obadiah", "short_name_am": "አብ", "short_name_en": "Obad", "testament": "old", "total_chapters": 3}, {"book_id": 48, "name_am": "ትንቢተ ዮናስ", "name_en": "Jonah", "short_name_am": "ዮና", "short_name_en": "Jonah", "testament": "old", "total_chapters": 4}, {"book_id": 49, "name_am": "ትንቢተ ናሆም", "name_en": "Nahum", "short_name_am": "ናሆ", "short_name_en": "Nahum", "testament": "old", "total_chapters": 3}, {"book_id": 50, "name_am": "ትንቢተ ዕንባቆም", "name_en": "Habakkuk", "short_name_am": "ዕን", "short_name_en": "Hab", "testament": "old", "total_chapters": 3}, {"book_id": 51, "name_am": "ትንቢተ ሶፎንያስ", "name_en": "Zephaniah", "short_name_am": "ሶፎ", "short_name_en": "Zeph", "testament": "old", "total_chapters": 3}, {"book_id": 52, "name_am": "ትንቢተ ሐጌ", "name_en": "Haggai", "short_name_am": "ሐጌ", "short_name_en": "Hag", "testament": "old", "total_chapters": 2}, {"book_id": 53, "name_am": "ትንቢተ ዘካርያስ", "name_en": "Zechariah", "short_name_am": "ዘካ", "short_name_en": "Zech", "testament": "old", "total_chapters": 14}, {"book_id": 54, "name_am": "ትንቢተ ሚልክያስ", "name_en": "Malachi", "short_name_am": "ሚል", "short_name_en": "Mal", "testament": "old", "total_chapters": 4}, {"book_id": 55, "name_am": "የማቴዎስ ወንጌል", "name_en": "Matthew", "short_name_am": "ማቴ", "short_name_en": "Matt", "testament": "new", "total_chapters": 129}, {"book_id": 56, "name_am": "የማርቆስ ወንጌል", "name_en": "Mark", "short_name_am": "ማር", "short_name_en": "Mark", "testament": "new", "total_chapters": 88}, {"book_id": 57, "name_am": "የሉቃስ ወንጌል", "name_en": "Luke", "short_name_am": "ሉቃ", "short_name_en": "Luke", "testament": "new", "total_chapters": 140}, {"book_id": 58, "name_am": "የዮሐንስ ወንጌል", "name_en": "John", "short_name_am": "ዮሐ", "short_name_en": "John", "testament": "new", "total_chapters": 96}, {"book_id": 59, "name_am": "የሐዋርያት ሥራ", "name_en": "Acts", "short_name_am": "የሐዋ", "short_name_en": "Acts", "testament": "new", "total_chapters": 85}, {"book_id": 60, "name_am": "ወደ ሮሜ ሰዎች", "name_en": "Romans", "short_name_am": "ሮሜ", "short_name_en": "Rom", "testament": "new", "total_chapters": 35}, {"book_id": 61, "name_am": "1ኛ ቆሮንቶስ", "name_en": "1 Corinthians", "short_name_am": "1 ቆሮ", "short_name_en": "1 Cor", "testament": "new", "total_chapters": 33}, {"book_id": 62, "name_am": "2ኛ ቆሮንቶስ", "name_en": "2 Corinthians", "short_name_am": "2 ቆሮ", "short_name_en": "2 Cor", "testament": "new", "total_chapters": 28}, {"book_id": 63, "name_am": "ወደ ገላትያ ሰዎች", "name_en": "Galatians", "short_name_am": "ገላ", "short_name_en": "Gal", "testament": "new", "total_chapters": 15}, {"book_id": 64, "name_am": "ወደ ኤፌሶን ሰዎች", "name_en": "Ephesians", "short_name_am": "ኤፌ", "short_name_en": "Eph", "testament": "new", "total_chapters": 14}, {"book_id": 65, "name_am": "ወደ ፊልጵስዩስ ሰዎች", "name_en": "Philippians", "short_name_am": "ፊል", "short_name_en": "Phil", "testament": "new", "total_chapters": 11}, {"book_id": 66, "name_am": "ወደ ቆላስይስ ሰዎች", "name_en": "Colossians", "short_name_am": "ቆላ", "short_name_en": "Col", "testament": "new", "total_chapters": 11}, {"book_id": 67, "name_am": "1ኛ ወደ ተሰሎንቄ ሰዎች", "name_en": "1 Thessalonians", "short_name_am": "1 ተሰ", "short_name_en": "1 Thess", "testament": "new", "total_chapters": 9}, {"book_id": 68, "name_am": "2ኛ ወደ ተሰሎንቄ ሰዎች", "name_en": "2 Thessalonians", "short_name_am": "2 ተሰ", "short_name_en": "2 Thess", "testament": "new", "total_chapters": 7}, {"book_id": 69, "name_am": "1ኛ ወደ ጢሞቴዎስ", "name_en": "1 Timothy", "short_name_am": "1 ጢሞ", "short_name_en": "1 Tim", "testament": "new", "total_chapters": 13}, {"book_id": 70, "name_am": "2ኛ ወደ ጢሞቴዎስ", "name_en": "2 Timothy", "short_name_am": "2 ጢሞ", "short_name_en": "2 Tim", "testament": "new", "total_chapters": 10}, {"book_id": 71, "name_am": "ወደ ቲቶ", "name_en": "Titus", "short_name_am": "ቲቶ", "short_name_en": "Titus", "testament": "new", "total_chapters": 5}, {"book_id": 72, "name_am": "ወደ ፊልሞና", "name_en": "Philemon", "short_name_am": "ፊል", "short_name_en": "Philem", "testament": "new", "total_chapters": 4}, {"book_id": 73, "name_am": "ወደ ዕብራውያን", "name_en": "Hebrews", "short_name_am": "ዕብ", "short_name_en": "Heb", "testament": "new", "total_chapters": 18}, {"book_id": 74, "name_am": "1ኛ ጴጥሮስ", "name_en": "1 Peter", "short_name_am": "1 ጴጥ", "short_name_en": "1 Pet", "testament": "new", "total_chapters": 12}, {"book_id": 75, "name_am": "2ኛ ጴጥሮስ", "name_en": "2 Peter", "short_name_am": "2 ጴጥ", "short_name_en": "2 Pet", "testament": "new", "total_chapters": 5}, {"book_id": 76, "name_am": "1ኛ የዮሃንስ መልእክት", "name_en": "1 John", "short_name_am": "1 ዮሃ", "short_name_en": "1 Joh", "testament": "new", "total_chapters": 5}, {"book_id": 77, "name_am": "የዮሐንስ መልእክት 2", "name_en": "2 John", "short_name_am": "2 ዮሐ", "short_name_en": "2 John", "testament": "new", "total_chapters": 3}, {"book_id": 78, "name_am": "3ኛ የዮሐንስ መልእክት", "name_en": "3 John", "short_name_am": "3 ዮሐ", "short_name_en": "3 John", "testament": "new", "total_chapters": 4}, {"book_id": 79, "name_am": "የያዕቆን መልእክት", "name_en": "James", "short_name_am": "ያዕ", "short_name_en": "James", "testament": "new", "total_chapters": 14}, {"book_id": 80, "name_am": "የይሁዳ መልእክት", "name_en": "Jude", "short_name_am": "ይሁዳ", "short_name_en": "Jud", "testament": "new", "total_chapters": 3}, {"book_id": 81, "name_am": "የዮሐንስ ራዕይ", "name_en": "Revelation", "short_name_am": "ራዕ", "short_name_en": "Rev", "testament": "new", "total_chapters": 39}]