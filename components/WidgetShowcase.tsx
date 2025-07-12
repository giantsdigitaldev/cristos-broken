import { COLORS } from '@/constants';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import DatePicker from './widgets/DatePicker';
import PrioritySelector from './widgets/PrioritySelector';
import ProgressIndicator from './widgets/ProgressIndicator';
import ProjectSummaryCard from './widgets/ProjectSummaryCard';
import TeamMemberCard from './widgets/TeamMemberCard';

const WidgetShowcase: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Available Chat Widgets</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Project Summary Card</Text>
        <ProjectSummaryCard
          id="showcase-project"
          name="Sample Project"
          description="This is a sample project to showcase the widget"
          status="active"
          numberOfTasks={5}
          numberOfCompletedTasks={2}
          numberOfDaysLeft={7}
          endDate="2024-01-15"
          onPress={() => console.log('Project pressed')}
          onEdit={() => console.log('Project edit')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Team Member Card</Text>
        <TeamMemberCard
          id="showcase-member"
          name="John Doe"
          email="john@example.com"
                          role="lead"
          avatar_url=""
          onPress={() => console.log('Member pressed')}
          onEdit={() => console.log('Member edit')}
          onRemove={() => console.log('Member remove')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Progress Indicator</Text>
        <ProgressIndicator
          progress={65}
          completed={13}
          total={20}
          color={COLORS.primary}
          title="Project Progress"
          onPress={() => console.log('Progress pressed')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Date Picker</Text>
        <DatePicker
          dateValue="2024-01-15"
          minDate="2024-01-01"
          maxDate="2024-12-31"
          title="Select Deadline"
          onDateChange={(date) => console.log('Date changed:', date)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Priority Selector</Text>
        <PrioritySelector
          priorityValue="high"
          options={['low', 'medium', 'high', 'urgent']}
          onPriorityChange={(priority) => console.log('Priority changed:', priority)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Widget Types Supported by AI</Text>
        <Text style={styles.description}>
          The AI can generate these widget types in chat responses:
        </Text>
        <View style={styles.widgetList}>
          <Text style={styles.widgetItem}>• &lt;projectname&gt; - Project name widget (new format)</Text>
          <Text style={styles.widgetItem}>• &lt;project_name&gt; - Project name widget (legacy)</Text>
          <Text style={styles.widgetItem}>• &lt;project_description&gt; - Project description widget</Text>
          <Text style={styles.widgetItem}>• &lt;deadline&gt; - Project deadline widget</Text>
          <Text style={styles.widgetItem}>• &lt;team_member&gt; - Team member widget</Text>
          <Text style={styles.widgetItem}>• &lt;task&gt; - Task widget</Text>
          <Text style={styles.widgetItem}>• &lt;subtask&gt; - Subtask widget</Text>
          <Text style={styles.widgetItem}>• &lt;progress&gt; - Progress indicator widget</Text>
          <Text style={styles.widgetItem}>• &lt;priority&gt; - Priority selector widget</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: COLORS.grayscale700,
    marginBottom: 12,
    lineHeight: 20,
  },
  widgetList: {
    marginTop: 8,
  },
  widgetItem: {
    fontSize: 14,
    color: COLORS.grayscale700,
    marginBottom: 4,
    lineHeight: 20,
  },
});

export default WidgetShowcase; 