var MAPS = { halsey: halsey_exports, field: field_exports };
var DEFAULT_MAP = "halsey";
function pickMap(id) {
  return MAPS[id] || MAPS[DEFAULT_MAP];
}
var mapList = () => Object.values(MAPS).map((m) => ({ id: m.meta.id, name: m.meta.title, sub: m.meta.sub || "", note: m.meta.sub || "" }));

