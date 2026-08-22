const appJson = require('./app.json');

function validateProductionEnvironment() {
  const environment = globalThis.process?.env ?? {};

  if (environment.EAS_BUILD_PROFILE !== 'production') {
    return;
  }

  const revenueCatKey = environment.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  const apiBaseUrl = environment.EXPO_PUBLIC_FIELDDOC_API_BASE_URL;

  if (!revenueCatKey) {
    throw new Error(
      'Production builds require EXPO_PUBLIC_REVENUECAT_IOS_API_KEY in the EAS production environment.',
    );
  }

  if (!revenueCatKey.startsWith('appl_')) {
    throw new Error(
      'Production builds require the RevenueCat iOS public SDK key beginning with appl_. Do not use a Test Store key, secret key, or Apple .p8 key.',
    );
  }

  if (!apiBaseUrl) {
    throw new Error(
      'Production builds require EXPO_PUBLIC_FIELDDOC_API_BASE_URL in the EAS production environment.',
    );
  }

  let parsedApiBaseUrl;

  try {
    parsedApiBaseUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error(
      'EXPO_PUBLIC_FIELDDOC_API_BASE_URL must be a valid HTTPS URL.',
    );
  }

  if (parsedApiBaseUrl.protocol !== 'https:') {
    throw new Error(
      'Production builds require an HTTPS EXPO_PUBLIC_FIELDDOC_API_BASE_URL.',
    );
  }
}

module.exports = () => {
  validateProductionEnvironment();
  return appJson.expo;
};
