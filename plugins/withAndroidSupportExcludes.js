const {
  withProjectBuildGradle,
  withGradleProperties,
  withMainApplication,
} = require('@expo/config-plugins');

function ensureBlock(contents, block) {
  if (contents.includes(block)) return contents;
  return `${contents}\n\n${block}\n`;
}

module.exports = function withAndroidSupportExcludes(config) {
  config = withGradleProperties(config, (c) => {
    const props = c.modResults;

    const setProp = (key, value) => {
      const existing = props.find((p) => p.type === 'property' && p.key === key);
      if (existing) existing.value = value;
      else props.push({ type: 'property', key, value });
    };

    setProp('android.useAndroidX', 'true');
    setProp('android.enableJetifier', 'true');

    return c;
  });

  config = withMainApplication(config, (c) => {
    let contents = c.modResults.contents;

    // RN 0.81 / Expo SDK 54 no longer exposes JSIModulePackage. Some older templates/plugins
    // still inject it, which breaks compilation with "Unresolved reference 'JSIModulePackage'".
    // Remove the import and the override if present.
    contents = contents.replace(/^\s*import\s+com\.facebook\.react\.bridge\.JSIModulePackage\s*\n/m, '');

    // Remove an override block like:
    // override fun getJSIModulePackage(): JSIModulePackage? { ... }
    // and also expression-bodied variants.
    contents = contents
      .replace(
        /\n\s*override\s+fun\s+getJSIModulePackage\s*\([^)]*\)\s*:\s*JSIModulePackage\??\s*\{[\s\S]*?\n\s*\}\s*(?=\n)/m,
        '\n',
      )
      .replace(
        /\n\s*override\s+fun\s+getJSIModulePackage\s*\([^)]*\)\s*:\s*JSIModulePackage\??\s*=.*(?=\n)/m,
        '\n',
      );

    c.modResults.contents = contents;
    return c;
  });

  config = withProjectBuildGradle(config, (c) => {
    const gradle = c.modResults;
    const excludeBlock = `// Added by ./plugins/withAndroidSupportExcludes
configurations.configureEach {
    exclude group: 'com.android.support'
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'support-core-utils'
    exclude group: 'com.android.support', module: 'support-v4'
    exclude group: 'com.android.support', module: 'versionedparcelable'
}

subprojects {
    configurations.configureEach {
        exclude group: 'com.android.support'
        exclude group: 'com.android.support', module: 'support-compat'
        exclude group: 'com.android.support', module: 'support-core-utils'
        exclude group: 'com.android.support', module: 'support-v4'
        exclude group: 'com.android.support', module: 'versionedparcelable'

        // Some libraries still depend on pre-AndroidX support libraries (28.0.0).
        // Substitute them to AndroidX to avoid duplicate classes.
        resolutionStrategy.dependencySubstitution {
            substitute module('com.android.support:appcompat-v7') using module('androidx.appcompat:appcompat:1.7.0')
            substitute module('com.android.support:support-compat') using module('androidx.core:core:1.13.1')
            substitute module('com.android.support:support-core-utils') using module('androidx.core:core:1.13.1')
            substitute module('com.android.support:support-core-ui') using module('androidx.core:core:1.13.1')
            substitute module('com.android.support:support-fragment') using module('androidx.fragment:fragment:1.7.1')
            substitute module('com.android.support:support-vector-drawable') using module('androidx.vectordrawable:vectordrawable:1.2.0')
            substitute module('com.android.support:animated-vector-drawable') using module('androidx.vectordrawable:vectordrawable-animated:1.2.0')
            substitute module('com.android.support:versionedparcelable') using module('androidx.versionedparcelable:versionedparcelable:1.1.1')
            substitute module('com.android.support:swiperefreshlayout') using module('androidx.swiperefreshlayout:swiperefreshlayout:1.1.0')
            substitute module('com.android.support:viewpager') using module('androidx.viewpager:viewpager:1.0.0')
            substitute module('com.android.support:coordinatorlayout') using module('androidx.coordinatorlayout:coordinatorlayout:1.2.0')
            substitute module('com.android.support:drawerlayout') using module('androidx.drawerlayout:drawerlayout:1.2.0')
            substitute module('com.android.support:slidingpanelayout') using module('androidx.slidingpanelayout:slidingpanelayout:1.2.0')
            substitute module('com.android.support:customview') using module('androidx.customview:customview:1.1.0')
            substitute module('com.android.support:asynclayoutinflater') using module('androidx.asynclayoutinflater:asynclayoutinflater:1.0.0')
            substitute module('com.android.support:loader') using module('androidx.loader:loader:1.1.0')
        }
    }
}`;

    c.modResults.contents = ensureBlock(gradle.contents, excludeBlock);
    return c;
  });

  return config;
};
