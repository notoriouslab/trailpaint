export default {
  // App
  'app.title': 'TrailPaint',
  'app.export': '📷 Export',
  'app.save': '💾 Save',
  'app.load': '📂 Load',

  // Sidebar
  'sidebar.title': 'TrailPaint',
  'search.placeholder': 'Search places...',
  'search.noResult': 'No results found',

  // Mode
  'mode.select': 'Select',
  'mode.addSpot': 'Add Spot',
  'mode.drawRoute': 'Draw Route',

  // SpotList
  'spot.empty': '📍 Tap "Add Spot" to mark the map\n🖊️ Tap "Draw Route" to trace a path\n📷 Drag an image to change the basemap',
  'spot.defaultTitle': 'Spot',

  // SpotEditor
  'editor.name': 'Name',
  'editor.desc': 'Description',
  'editor.icon': 'Icon',
  'editor.photo': 'Photo',
  'editor.uploadPhoto': 'Upload Photo',
  'editor.changePhoto': 'Change Photo',
  'editor.removePhoto': 'Remove Photo',
  'editor.delete': 'Delete Spot',
  'editor.deleteConfirm': 'Delete this spot?',

  // Route
  'route.finish': 'Finish Route',
  'route.cancel': 'Cancel',
  'route.hintStart': 'Click the map to mark the starting point',
  'route.hintPoints': 'points — keep clicking or press "Finish Route"',
  'route.editTitle': 'Edit Route',
  'route.points': 'nodes',
  'route.color': 'Route Color',
  'route.editHint': 'Drag nodes to adjust · Double-click to delete',
  'route.listTitle': 'Routes',
  'route.namePlaceholder': 'Route name (auto-detected)',
  'route.fetchEle': '⛰️ Fetch Elevation',
  'route.fetchingEle': 'Fetching...',
  'route.delete': 'Delete Route',
  'route.deleteConfirm': 'Delete this route?',

  // GPX
  'gpx.import': '📥 GPX',
  'gpx.importFailed': 'GPX import failed',

  // Export
  'export.failed': 'PNG export failed. Possible CORS restriction on tiles.',
  'export.3xWarn': '3x export requires more memory and may fail on large maps. Continue?',
  'import.failed': 'Load failed: invalid file format',

  // Background
  'bg.upload': 'Upload image',
  'bg.backToMap': 'Back to map',
  'bg.dropHint': 'Drop image here',

  // Basemap
  'basemap.switch': 'Switch basemap',
  'basemap.voyager': 'Standard',
  'basemap.satellite': 'Satellite',
  'basemap.topo': 'Topographic',
  'basemap.dark': 'Dark',

  // Undo/Redo
  'undo': 'Undo',
  'redo': 'Redo',

  // Settings
  'settings.title': 'Settings',
  'settings.handDrawn': 'Hand-drawn wobble',
  'settings.watermark': 'Watermark',

  // Icons
  'icon.leaf': 'Plant',
  'icon.flower': 'Flower',
  'icon.tree': 'Tree',
  'icon.bird': 'Bird',
  'icon.bug': 'Insect',
  'icon.water': 'Water',
  'icon.fish': 'Fish',
  'icon.mushroom': 'Mushroom',
  'icon.rock': 'Rock',
  'icon.toilet': 'Restroom',
  'icon.bus': 'Bus Stop',
  'icon.rest': 'Rest Area',
  'icon.food': 'Restaurant',
  'icon.bike': 'Bicycle',
  'icon.parking': 'Parking',
  'icon.firstaid': 'First Aid',
  'icon.sun': 'Viewpoint',
  'icon.camera': 'Photo Spot',
  'icon.warning': 'Caution',
  'icon.info': 'Info',
  'icon.pin': 'Marker',
} as const;
