const appJson = require('./app.json');

function validateProductionEnvironment() {
  const environment = globalThis.process?.env ?? {};

  if (environment.EAS_BUILD_PROFILE !== 'production') {
    return;
  }

  const revenueCatKey = environment.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

  if (!revenueCatKey) {
    throw new Error(
      'Production builds require EXPO_PUBLIC_REVENUECAT_IOS_API_KEY in the EAS production environment.',
    );
  }

  if (revenueCatKey.startsWith('test_')) {
    throw new Error(
      'Production builds cannot use a RevenueCat Test Store key. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY to the public SDK key for the RevenueCat iOS App Store app.',
    );
  }
}

module.exports = () => {
  validateProductionEnvironment();
  return appJson.expo;
};
