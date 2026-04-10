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
  'spot.loadSample': 'Load sample trail ▼',

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
  'route.fetchEleFailed': 'Elevation query failed, please try again later',
  'route.delete': 'Delete Route',
  'route.deleteConfirm': 'Delete this route?',

  // GPX
  'gpx.import': '📥 GPX',
  'gpx.importFailed': 'GPX import failed',

  // Export
  'export.failed': 'PNG export failed. Possible CORS restriction on tiles.',
  'export.3xWarn': '3x export requires more memory and may fail on large maps. Continue?',
  'import.failed': 'Load failed: invalid file format',
  'export.borderStyle': 'Border style',
  'export.border.classic': 'Classic double',
  'export.border.paper': 'Paper hand-drawn',
  'export.border.minimal': 'Minimal thin',

  // Export Preview
  'export.preview.title': 'Export Preview',
  'export.preview.capturing': 'Capturing...',
  'export.preview.format': 'Aspect Ratio',
  'export.preview.filter': 'Style Filter',
  'export.preview.resolution': 'Resolution',
  'export.preview.download': 'Download PNG',
  'export.preview.downloading': 'Exporting...',
  'export.preview.shareLink': 'Copy Share Link',
  'export.preview.shareCopied': 'Share link copied!',
  'export.preview.aiPrompt': 'Copy AI Prompt',
  'export.preview.aiCopied': 'AI prompt copied!',
  'export.format.full': 'Original',
  'export.format.1:1': '1:1 (IG)',
  'export.format.9:16': '9:16 (Story)',
  'export.format.4:3': '4:3',
  'export.filter.original': 'Original',
  'export.filter.watercolor': 'Watercolor',
  'export.filter.sketch': 'Sketch',
  'export.filter.vintage': 'Vintage',
  'export.filter.comic': 'Comic',

  // Background
  'bg.upload': 'Upload image',
  'bg.backToMap': 'Back to map',
  'bg.dropHint': 'Drop image here',

  // Locate
  'locate.title': 'Locate me',
  'locate.denied': 'Location permission denied. Please allow in browser settings.',
  'locate.unavailable': 'Unable to get current location. Check that location services are enabled.',

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

  // Onboarding
  'onboarding.step1.title': 'Search or drop an image to start',
  'onboarding.step1.desc': 'Search for a place to fly there, or drag an image onto the map to use it as a custom basemap.',
  'onboarding.step1.hint': '🔍 Search places · 📷 Drop image to change basemap',
  'onboarding.step2.title': 'Add spots & draw routes',
  'onboarding.step2.desc': 'Tap "Add Spot" to pin locations, then tap "Draw Route" to sketch hand-drawn paths between them.',
  'onboarding.step2.hint': '📍 Add Spot · 🖊️ Draw Route',
  'onboarding.step3.title': 'Export & share',
  'onboarding.step3.desc': 'Export your map as a beautiful illustrated image, with multiple aspect ratios ready for social sharing.',
  'onboarding.step3.hint': '📷 Export illustrated map · Multiple aspect ratios',
  'onboarding.loadSample': '🏔️ Load Yangmingshan sample trail',
  'onboarding.next': 'Next',
  'onboarding.start': 'Get Started',
  'onboarding.skip': 'Skip',

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
