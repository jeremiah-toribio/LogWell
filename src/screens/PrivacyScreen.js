import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';

export default function PrivacyScreen() {
  const openLink = (url) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Privacy & Data Practices</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Commitment to Privacy</Text>
        <Text style={styles.text}>
          LogWell is designed with your privacy as a priority. All your personal health and
          fitness data stays on your device. We do not collect, transmit, or store your
          personal data on external servers.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What Data We Collect</Text>
        <Text style={styles.text}>
          LogWell collects the following types of data locally on your device:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>Sleep Data:</Text> Sleep and wake times, duration, date ranges, and optional effectiveness ratings</Text>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>Workout Data:</Text> Exercise names, muscle groups, sets, reps, weights, notes, dates, and optional effectiveness ratings</Text>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>Focus Data:</Text> Focus labels, session durations, pomodoro timers, dates, and optional effectiveness ratings</Text>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>App Settings:</Text> Your preferences for visible tabs and app configuration</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How We Use Your Data</Text>
        <Text style={styles.text}>
          Your personal health and fitness data is used exclusively for:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Displaying your activity history and logs</Text>
          <Text style={styles.bullet}>• Calculating statistics and metrics</Text>
          <Text style={styles.bullet}>• Generating charts and visualizations</Text>
          <Text style={styles.bullet}>• Providing insights into your habits and patterns</Text>
        </View>
        <Text style={styles.text}>
          We do <Text style={styles.boldText}>NOT</Text> use your personal health data for:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Advertising targeting or personalization</Text>
          <Text style={styles.bullet}>• Selling or sharing with other companies</Text>
          <Text style={styles.bullet}>• Tracking your behavior across other apps</Text>
        </View>
      </View>

      <View style={[styles.section, styles.highlightSection]}>
        <Text style={styles.sectionTitle}>Advertising</Text>
        <Text style={styles.text}>
          LogWell displays rewarded video advertisements to free users who have reached their
          weekly entry limit. These ads are provided by <Text style={styles.boldText}>Google AdMob</Text>.
        </Text>
        <Text style={[styles.text, styles.subheading]}>What AdMob Collects</Text>
        <Text style={styles.text}>
          When you watch an ad, Google AdMob may collect certain information including:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Device identifiers (Advertising ID)</Text>
          <Text style={styles.bullet}>• IP address and general location (country/region)</Text>
          <Text style={styles.bullet}>• Device information (model, OS version)</Text>
          <Text style={styles.bullet}>• Ad interaction data (views, clicks)</Text>
        </View>
        <Text style={styles.text}>
          We request <Text style={styles.boldText}>non-personalized ads only</Text>, which limits
          the data used for ad selection. However, Google may still collect device-level
          information for fraud prevention and analytics.
        </Text>
        <Text style={[styles.text, styles.subheading]}>Your Choices</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>Opt out of personalized ads:</Text> Adjust your device's ad settings (iOS: Settings → Privacy → Tracking; Android: Settings → Google → Ads)</Text>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>Upgrade to Premium:</Text> Premium subscribers never see ads</Text>
        </View>
        <TouchableOpacity onPress={() => openLink('https://policies.google.com/privacy')}>
          <Text style={styles.link}>View Google's Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openLink('https://policies.google.com/technologies/partner-sites')}>
          <Text style={styles.link}>How Google Uses Data from Partners</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Storage & Security</Text>
        <Text style={styles.text}>
          All your personal health and fitness data is stored locally on your device using
          secure storage mechanisms. This data is not transmitted to external servers.
          Your data remains under your control at all times.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Rights & Control</Text>
        <Text style={styles.text}>
          You have complete control over your data:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>Export Your Data:</Text> Download all your data in JSON or CSV format from the Settings screen</Text>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>Delete Your Data:</Text> Clear all data at any time through the Settings screen</Text>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>Data Portability:</Text> Your exported data can be imported into other applications</Text>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>No Account Required:</Text> All data stays local - no user account or registration needed</Text>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>Reset Advertising ID:</Text> You can reset your device's advertising identifier at any time in your device settings</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.text}>
          LogWell integrates with the following third-party services:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• <Text style={styles.boldText}>Google AdMob:</Text> Provides rewarded video advertisements for free users</Text>
        </View>
        <Text style={styles.text}>
          We do not share your personal health and fitness data with any third parties.
          AdMob operates independently and does not have access to your logged activities.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Retention</Text>
        <Text style={styles.text}>
          Your personal data is retained locally on your device until you choose to delete it.
          If you uninstall the app, all local data will be permanently removed from your device.
        </Text>
        <Text style={styles.text}>
          Data collected by Google AdMob is subject to Google's data retention policies.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Children's Privacy</Text>
        <Text style={styles.text}>
          LogWell is not directed at children under 13. We do not knowingly collect personal
          information from children under 13. If you are a parent or guardian and believe
          your child has provided us with personal information, please contact us.
        </Text>
        <Text style={styles.text}>
          Ads shown in the app are configured to comply with child-directed treatment
          requirements where applicable.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>International Users</Text>
        <Text style={styles.text}>
          If you are located in the European Economic Area (EEA), United Kingdom, or other
          regions with data protection laws, you have certain rights regarding your personal data.
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Your health data remains on your device and is not transferred internationally</Text>
          <Text style={styles.bullet}>• Ad-related data may be processed by Google in accordance with their privacy policy</Text>
          <Text style={styles.bullet}>• You can opt out of personalized advertising through your device settings</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Changes to Privacy Practices</Text>
        <Text style={styles.text}>
          If we make changes to our privacy practices, we will update this screen and
          notify users through the app. The current version of this privacy policy is
          effective as of February 2026.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.text}>
          If you have questions about privacy or data practices, please contact us through
          the App Store support page.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Last Updated: February 2026</Text>
        <Text style={styles.footerText}>Version 1.1</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#007AFF',
  },
  subheading: {
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '600',
    color: '#000',
  },
  bulletList: {
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 24,
    color: '#333',
    marginBottom: 6,
  },
  link: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
    marginTop: 8,
    marginBottom: 4,
  },
  footer: {
    alignItems: 'center',
    padding: 24,
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});
