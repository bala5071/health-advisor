import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, TextInput, useWindowDimensions, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHealthProfile } from '../../src/hooks/useHealthProfile';
import { useTheme } from '../../src/theme/useTheme';
import { useAuth } from '../../src/components/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const CategoryIcon = ({ name, bg }: { name: keyof typeof Ionicons.glyphMap; bg: string }) => (
  <View style={[styles.categoryIconCircle, { backgroundColor: bg }]}>
    <Ionicons name={name} size={18} color="#FFFFFF" />
  </View>
);

type SummaryCategory = 'conditions' | 'medications' | 'allergies';

type PendingDelete = {
  type: SummaryCategory;
  id: string;
};

type EditSection = {
  key: SummaryCategory;
  title: string;
  addLabel: string;
  data: Array<{ id: string }>;
};

const categoryKey = (type: SummaryCategory, id: string) => `${type}:${id}`;

const AnimatedInlineForm = ({ visible, children }: { visible: boolean; children: React.ReactNode }) => {
  const [contentHeight, setContentHeight] = useState(0);
  const [measured, setMeasured] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!measured) return;
    progress.value = withTiming(visible ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, measured, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: contentHeight * progress.value,
    opacity: progress.value,
    overflow: 'hidden',
  }));

  return (
    <>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', opacity: 0 }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && h !== contentHeight) {
            setContentHeight(h);
            setMeasured(true);
          }
        }}
      >
        {children}
      </View>

      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </>
  );
};

const AnimatedListRow = ({
  rowKey,
  isDeleting,
  onDeleteComplete,
  children,
}: {
  rowKey: string;
  isDeleting: boolean;
  onDeleteComplete: () => void;
  children: React.ReactNode;
}) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.quad),
    });
  }, [opacity, rowKey]);

  useEffect(() => {
    if (!isDeleting) return;
    opacity.value = withTiming(0, {
      duration: 180,
      easing: Easing.in(Easing.quad),
    }, (finished) => {
      if (finished) {
        runOnJS(onDeleteComplete)();
      }
    });
  }, [isDeleting, onDeleteComplete, opacity]);

  const rowAnimatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={rowAnimatedStyle}>{children}</Animated.View>;
};

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    dbAvailable,
    loading,
    initialized,
    isSignedIn,
    error,
    conditions,
    allergies,
    medications,
    addCondition,
    deleteCondition,
    addAllergy,
    deleteAllergy,
    addMedication,
    deleteMedication,
  } = useHealthProfile();

  const [actionBusy, setActionBusy] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [activeAddForm, setActiveAddForm] = useState<'conditions' | 'medications' | 'allergies' | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deletingRowKey, setDeletingRowKey] = useState<string | null>(null);
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '' });
  const [newAllergy, setNewAllergy] = useState({ name: '', severity: 'None' });
  const editScreenTranslateX = useSharedValue(width);

  useEffect(() => {
    if (isEditingSummary) {
      editScreenTranslateX.value = width;
      editScreenTranslateX.value = withTiming(0, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }
    editScreenTranslateX.value = withTiming(width, {
      duration: 220,
      easing: Easing.in(Easing.cubic),
    });
  }, [editScreenTranslateX, isEditingSummary, width]);

  const editScreenAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: editScreenTranslateX.value }],
  }));

  const initials = (() => {
    const email = String(user?.email || 'U');
    const base = email.split('@')[0] || 'U';
    return base.slice(0, 2).toUpperCase();
  })();

  const displayName = (() => {
    const email = String(user?.email || 'Health Advisor User');
    const prefix = email.split('@')[0] || 'Health Advisor User';
    return prefix.slice(0, 1).toUpperCase() + prefix.slice(1);
  })();

  const memberSince = (() => {
    const created = (user as any)?.created_at;
    if (!created) return 'Member since recently';
    try {
      return `Member since ${new Date(created).toLocaleDateString()}`;
    } catch {
      return 'Member since recently';
    }
  })();

  if (initialized && !isSignedIn) {
    return (
      <View style={[styles.centerState, { backgroundColor: theme.background }]}> 
        <Text allowFontScaling style={[styles.centerStateText, { color: theme.text }]}>Sign in to view profile.</Text>
      </View>
    );
  }

  if (!dbAvailable) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ fontSize: 16, textAlign: 'center' }}>
          Local database is not available in this runtime. Use a development build to enable WatermelonDB.
        </Text>
      </View>
    );
  }

  const summarize = (items: string[]) => {
    if (loading) return 'Loading...';
    if (items.length === 0) return 'None added';
    const text = items.join(', ');
    return text.length > 40 ? `${text.slice(0, 40)}...` : text;
  };

  const openAddForm = (form: 'conditions' | 'medications' | 'allergies') => {
    setInlineError(null);
    setPendingDelete(null);
    setActiveAddForm((current) => (current === form ? null : form));
  };

  const closeAddForm = () => {
    setInlineError(null);
    setActiveAddForm(null);
  };

  const handlePressAddCondition = () => {
    console.log('[HealthSummaryEdit] + Add Condition pressed');
    openAddForm('conditions');
  };

  const handlePressAddMedication = () => {
    console.log('[HealthSummaryEdit] + Add Medication pressed');
    openAddForm('medications');
  };

  const handlePressAddAllergy = () => {
    console.log('[HealthSummaryEdit] + Add Allergy pressed');
    openAddForm('allergies');
  };

  const handleAddCondition = async () => {
    console.log('[HealthSummaryEdit] Save Condition tapped');
    if (actionBusy) return;
    const value = newCondition.trim();
    if (!value) return;

    setActionBusy(true);
    try {
      const ok = await addCondition(value);
      if (ok) {
        setNewCondition('');
        setActiveAddForm(null);
        setInlineError(null);
      } else {
        setInlineError('Unable to save condition.');
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenHealthSummaryEdit = (targetSection?: SummaryCategory) => {
    setInlineError(null);
    setPendingDelete(null);
    setActiveAddForm(targetSection ?? null);
    setDeletingRowKey(null);
    setIsEditingSummary(true);
  };

  const handleCloseHealthSummaryEdit = () => {
    setInlineError(null);
    setPendingDelete(null);
    setActiveAddForm(null);
    setDeletingRowKey(null);
    setIsEditingSummary(false);
  };

  const handleAddAllergy = async () => {
    console.log('[HealthSummaryEdit] Save Allergy tapped');
    if (actionBusy) return;
    const name = newAllergy.name.trim();
    if (!name) return;

    setActionBusy(true);
    try {
      const ok = await addAllergy({ name, severity: newAllergy.severity.trim() });
      if (ok) {
        setNewAllergy({ name: '', severity: 'None' });
        setActiveAddForm(null);
        setInlineError(null);
      } else {
        setInlineError('Unable to save allergy.');
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleAddMedication = async () => {
    console.log('[HealthSummaryEdit] Save Medication tapped');
    if (actionBusy) return;
    const name = newMedication.name.trim();
    if (!name) return;

    setActionBusy(true);
    try {
      const ok = await addMedication({
        name,
        dosage: newMedication.dosage.trim(),
        frequency: '',
        notes: '',
      });
      if (ok) {
        setNewMedication({ name: '', dosage: '' });
        setActiveAddForm(null);
        setInlineError(null);
      } else {
        setInlineError('Unable to save medication.');
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteCondition = async (conditionId: string) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const ok = await deleteCondition(conditionId);
      if (!ok) {
        setInlineError('Unable to delete condition.');
      } else {
        setPendingDelete(null);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteAllergy = async (allergyId: string) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const ok = await deleteAllergy(allergyId);
      if (!ok) {
        setInlineError('Unable to delete allergy.');
      } else {
        setPendingDelete(null);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteMedication = async (medicationId: string) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const ok = await deleteMedication(medicationId);
      if (!ok) {
        setInlineError('Unable to delete medication.');
      } else {
        setPendingDelete(null);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    setDeletingRowKey(categoryKey(pendingDelete.type, pendingDelete.id));
  };

  const handleDeleteAfterAnimation = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'conditions') {
      await handleDeleteCondition(pendingDelete.id);
    } else if (pendingDelete.type === 'medications') {
      await handleDeleteMedication(pendingDelete.id);
    } else {
      await handleDeleteAllergy(pendingDelete.id);
    }
    setDeletingRowKey(null);
  };

  const getSeverityPillStyle = (value: string) => {
    if (value === 'Severe') return [styles.allergySeverityPill, styles.allergySeveritySevere];
    if (value === 'Moderate') return [styles.allergySeverityPill, styles.allergySeverityModerate];
    if (value === 'Mild') return [styles.allergySeverityPill, styles.allergySeverityMild];
    return [styles.allergySeverityPill, styles.allergySeverityNone];
  };

  const editSections = useMemo<EditSection[]>(
    () => [
      { key: 'conditions', title: 'CONDITIONS', addLabel: '+ Add Condition', data: [{ id: 'conditions-section' }] },
      { key: 'medications', title: 'MEDICATIONS', addLabel: '+ Add Medication', data: [{ id: 'medications-section' }] },
      { key: 'allergies', title: 'ALLERGIES', addLabel: '+ Add Allergy', data: [{ id: 'allergies-section' }] },
    ],
    [],
  );

  const getEditSectionMeta = (key: SummaryCategory) => {
    if (key === 'conditions') {
      return { color: '#FF2D55', count: conditions.length, label: 'CONDITIONS' };
    }
    if (key === 'medications') {
      return { color: '#007AFF', count: medications.length, label: 'MEDICATIONS' };
    }
    return { color: '#FF9500', count: allergies.length, label: 'ALLERGIES' };
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={[styles.profileHeader, { backgroundColor: theme.surface }]}> 
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <View style={styles.profileHeaderText}>
          <Text style={[styles.heroTitle, theme.typography.headline, { color: theme.text }]}>{displayName}</Text>
          <Text style={[styles.heroEmail, theme.typography.caption, { color: theme.textSecondary }]}>{String(user?.email || 'user@email.com')}</Text>
          <Text style={[styles.heroSubtitle, theme.typography.caption, { color: theme.textSecondary }]}>{memberSince}</Text>
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <View style={styles.sectionHeaderRow}>
          <Text allowFontScaling style={[styles.sectionTitle, theme.typography.body, { color: theme.text }]}>Health Summary</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => handleOpenHealthSummaryEdit()}
            accessibilityLabel="Edit health summary"
            accessibilityHint="Opens health summary editor"
          >
            <Text allowFontScaling style={[styles.sectionAction, { color: theme.accent }]}>Edit</Text>
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.summaryLoadingRow}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text allowFontScaling style={[styles.emptyText, theme.typography.caption, { color: theme.textSecondary }]}>Loading summary...</Text>
          </View>
        ) : (
          <View style={[styles.summaryList, { backgroundColor: theme.surface }]}> 
            <Pressable style={styles.summaryLine} onPress={() => handleOpenHealthSummaryEdit('conditions')}>
              <CategoryIcon name="fitness" bg="#FF2D55" />
              <View style={styles.summaryLineMiddle}>
                <Text allowFontScaling style={[styles.summaryLineLabel, theme.typography.body, { color: theme.text }]}>Conditions</Text>
              </View>
              <View style={styles.summaryLineRight}>
                <Text allowFontScaling style={[styles.summaryCountPill, styles.summaryCountConditions]}>{conditions.length}</Text>
                <Text allowFontScaling numberOfLines={1} style={[styles.summaryLineValue, theme.typography.subhead, { color: theme.textSecondary }]}>
                  {summarize(conditions.map((c: any) => String(c?.name ?? '').trim()).filter(Boolean))}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </Pressable>
            <View style={[styles.summarySeparator, { backgroundColor: theme.border }]} />

            <Pressable style={styles.summaryLine} onPress={() => handleOpenHealthSummaryEdit('medications')}>
              <CategoryIcon name="medkit" bg="#007AFF" />
              <View style={styles.summaryLineMiddle}>
                <Text allowFontScaling style={[styles.summaryLineLabel, theme.typography.body, { color: theme.text }]}>Medications</Text>
              </View>
              <View style={styles.summaryLineRight}>
                <Text allowFontScaling style={[styles.summaryCountPill, styles.summaryCountMedications]}>{medications.length}</Text>
                <Text allowFontScaling numberOfLines={1} style={[styles.summaryLineValue, theme.typography.subhead, { color: theme.textSecondary }]}>
                  {summarize(medications.map((m: any) => {
                  const name = String(m?.name ?? '').trim();
                  const dosage = String(m?.dosage ?? '').trim();
                  return dosage ? `${name} ${dosage}` : name;
                }).filter(Boolean))}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </Pressable>
            <View style={[styles.summarySeparator, { backgroundColor: theme.border }]} />

            <Pressable style={styles.summaryLine} onPress={() => handleOpenHealthSummaryEdit('allergies')}>
              <CategoryIcon name="warning" bg="#FF9500" />
              <View style={styles.summaryLineMiddle}>
                <Text allowFontScaling style={[styles.summaryLineLabel, theme.typography.body, { color: theme.text }]}>Allergies</Text>
              </View>
              <View style={styles.summaryLineRight}>
                <Text allowFontScaling style={[styles.summaryCountPill, styles.summaryCountAllergies]}>{allergies.length}</Text>
                <Text allowFontScaling numberOfLines={1} style={[styles.summaryLineValue, theme.typography.subhead, { color: theme.textSecondary }]}>
                  {summarize(allergies.map((a: any) => String(a?.name ?? '').trim()).filter(Boolean))}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </Pressable>
          </View>
        )}
      </View>

      {error ? <Text allowFontScaling style={[styles.errorText, { color: theme.danger }]}>Error: {error}</Text> : null}

      <Text style={[styles.settingsSectionHeader, theme.typography.caption, { color: theme.textSecondary }]}>SETTINGS</Text>
      <View style={[styles.settingsGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable
          onPress={() => router.push('/settings')}
          style={[styles.settingsRow, { backgroundColor: theme.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          accessibilityHint="Opens app settings"
        >
          <View style={styles.settingsRowLeft}>
            <View style={[styles.settingsIconWrap, styles.settingsIconBlue]}> 
              <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingsTextWrap}>
              <Text allowFontScaling style={[styles.settingsLabel, theme.typography.subhead, { color: theme.text }]}>Settings</Text>
              <Text allowFontScaling style={[styles.settingsSubLabel, theme.typography.caption, { color: theme.textSecondary }]}>Notifications and app behavior</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </Pressable>
        <View style={[styles.summarySeparator, { backgroundColor: theme.border }]} />
        <Pressable
          onPress={() => router.push('/settings/account')}
          style={[styles.settingsRow, { backgroundColor: theme.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Open account and deletion settings"
          accessibilityHint="Opens account and deletion options"
        >
          <View style={styles.settingsRowLeft}>
            <View style={[styles.settingsIconWrap, styles.settingsIconGray]}> 
              <Ionicons name="person-circle-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingsTextWrap}>
              <Text allowFontScaling style={[styles.settingsLabel, theme.typography.subhead, { color: theme.text }]}>Account & Deletion</Text>
              <Text allowFontScaling style={[styles.settingsSubLabel, theme.typography.caption, { color: theme.textSecondary }]}>Manage account data and deletion</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </Pressable>
      </View>
      </ScrollView>

      <Animated.View
        style={[
          styles.editScreen,
          editScreenAnimatedStyle,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
        pointerEvents={isEditingSummary ? 'auto' : 'none'}
      >
        <KeyboardAvoidingView
          style={styles.editScreenKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top}
        >
          <View style={[styles.editHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}> 
            <Pressable
              style={styles.editHeaderBackButton}
              onPress={handleCloseHealthSummaryEdit}
              accessibilityRole="button"
              accessibilityLabel="Back"
              accessibilityHint="Returns to profile"
            >
              <Ionicons name="chevron-back" size={22} color={theme.accent} />
            </Pressable>
            <Text allowFontScaling style={[styles.editHeaderTitle, { color: theme.text }]}>Edit Health Profile</Text>
            <View style={styles.editHeaderSpacer} />
          </View>

          <SectionList
            style={styles.editScroll}
            sections={editSections}
            keyExtractor={(item) => item.id}
            extraData={activeAddForm}
            stickySectionHeadersEnabled={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.editContent, { paddingBottom: insets.bottom + 16 }]}
            renderSectionHeader={({ section }) => {
              const meta = getEditSectionMeta(section.key);
              return (
                <View style={styles.groupLabelRow}>
                  <View style={[styles.groupLabelAccent, { backgroundColor: meta.color }]} />
                  <Text allowFontScaling style={[styles.groupLabel, { color: theme.textSecondary }]}>{meta.label}</Text>
                  <Text allowFontScaling style={[styles.groupLabelCount, { color: theme.textSecondary }]}>({meta.count})</Text>
                </View>
              );
            }}
            SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
            renderItem={({ section }) => {
              const isConditions = section.key === 'conditions';
              const isMedications = section.key === 'medications';
              const items = isConditions ? conditions : isMedications ? medications : allergies;
              const formVisible = activeAddForm === section.key;

              return (
                <View style={[styles.groupCard, { backgroundColor: theme.surface }]}>
                  {items.map((item: any, index: number) => {
                    const rowKey = categoryKey(section.key, item.id);
                    const isConfirming = pendingDelete?.type === section.key && pendingDelete.id === item.id;
                    const isLastItem = index === items.length - 1;
                    const showSeparator = !isLastItem || formVisible;
                    const severity = String(item?.severity || 'None');

                    return (
                      <AnimatedListRow
                        key={rowKey}
                        rowKey={rowKey}
                        isDeleting={deletingRowKey === rowKey}
                        onDeleteComplete={handleDeleteAfterAnimation}
                      >
                        <View style={[styles.editRow, isConfirming ? styles.editRowDanger : null]}>
                          {isConfirming ? (
                            <>
                              <Text allowFontScaling style={styles.editRowConfirmText}>Remove?</Text>
                              <Pressable style={styles.confirmPill} onPress={handleConfirmDelete}>
                                <Text allowFontScaling style={styles.confirmPillText}>Confirm</Text>
                              </Pressable>
                              <Pressable style={styles.cancelPill} onPress={() => setPendingDelete(null)}>
                                <Text allowFontScaling style={styles.cancelPillText}>Cancel</Text>
                              </Pressable>
                            </>
                          ) : isConditions ? (
                            <>
                              <Text allowFontScaling style={styles.editRowText}>{String(item?.name ?? '')}</Text>
                              <Pressable
                                style={styles.deleteTouch}
                                onPress={() => setPendingDelete({ type: 'conditions', id: item.id })}
                              >
                                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                              </Pressable>
                            </>
                          ) : isMedications ? (
                            <>
                              <Text allowFontScaling style={styles.editRowText}>
                                {String(item?.name ?? '')}{item?.dosage ? ` ${String(item.dosage)}` : ''}
                              </Text>
                              <Pressable
                                style={styles.deleteTouch}
                                onPress={() => setPendingDelete({ type: 'medications', id: item.id })}
                              >
                                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                              </Pressable>
                            </>
                          ) : (
                            <>
                              <Text allowFontScaling style={styles.editRowText}>{String(item?.name ?? '')}</Text>
                              <View style={styles.allergyRightRow}>
                                <View style={getSeverityPillStyle(severity)}>
                                  <Text allowFontScaling style={styles.allergySeverityText}>{severity}</Text>
                                </View>
                                <Pressable
                                  style={styles.deleteTouch}
                                  onPress={() => setPendingDelete({ type: 'allergies', id: item.id })}
                                >
                                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                                </Pressable>
                              </View>
                            </>
                          )}
                          {showSeparator ? <View pointerEvents="none" style={[styles.insetSeparator, { backgroundColor: theme.border }]} /> : null}
                        </View>
                      </AnimatedListRow>
                    );
                  })}

                  <Pressable
                    style={styles.addRow}
                    onPress={
                      isConditions ? handlePressAddCondition : isMedications ? handlePressAddMedication : handlePressAddAllergy
                    }
                  >
                    <Text allowFontScaling style={styles.addRowText}>{section.addLabel}</Text>
                    {formVisible ? <View pointerEvents="none" style={[styles.insetSeparator, { backgroundColor: theme.border }]} /> : null}
                  </Pressable>

                  <AnimatedInlineForm visible={formVisible}>
                    <View style={[styles.inlineFormBody, { backgroundColor: theme.surface }]}>
                      {isConditions ? (
                        <>
                          <TextInput
                            placeholder="Condition name"
                            placeholderTextColor={theme.secondary}
                            value={newCondition}
                            onChangeText={setNewCondition}
                            style={[styles.inlineInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
                          />
                          <View style={styles.inlineActionRow}>
                            <Pressable style={[styles.cancelTextButton, { backgroundColor: theme.background }]} onPress={closeAddForm}>
                              <Text allowFontScaling style={[styles.cancelTextButtonLabel, { color: theme.textSecondary }]}>Cancel</Text>
                            </Pressable>
                            <Pressable style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleAddCondition} disabled={actionBusy}>
                              {actionBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text allowFontScaling style={styles.saveButtonLabel}>Save</Text>}
                            </Pressable>
                          </View>
                        </>
                      ) : isMedications ? (
                        <>
                          <TextInput
                            placeholder="Medication name"
                            placeholderTextColor={theme.secondary}
                            value={newMedication.name}
                            onChangeText={(text) => setNewMedication({ ...newMedication, name: text })}
                            style={[styles.inlineInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
                          />
                          <TextInput
                            placeholder="Dosage (optional)"
                            placeholderTextColor={theme.secondary}
                            value={newMedication.dosage}
                            onChangeText={(text) => setNewMedication({ ...newMedication, dosage: text })}
                            style={[styles.inlineInput, styles.stackedInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
                          />
                          <View style={styles.inlineActionRow}>
                            <Pressable style={[styles.cancelTextButton, { backgroundColor: theme.background }]} onPress={closeAddForm}>
                              <Text allowFontScaling style={[styles.cancelTextButtonLabel, { color: theme.textSecondary }]}>Cancel</Text>
                            </Pressable>
                            <Pressable style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleAddMedication} disabled={actionBusy}>
                              {actionBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text allowFontScaling style={styles.saveButtonLabel}>Save</Text>}
                            </Pressable>
                          </View>
                        </>
                      ) : (
                        <>
                          <TextInput
                            placeholder="Allergy name"
                            placeholderTextColor={theme.secondary}
                            value={newAllergy.name}
                            onChangeText={(text) => setNewAllergy({ ...newAllergy, name: text })}
                            style={[styles.inlineInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
                          />
                          <View style={styles.severitySegmentRow}>
                            {(['None', 'Mild', 'Moderate', 'Severe'] as const).map((level) => (
                              <Pressable
                                key={level}
                                style={[
                                  styles.segmentPill,
                                  newAllergy.severity === level ? styles.segmentPillActive : null,
                                  level === 'None' ? styles.segmentNone : null,
                                  level === 'Mild' ? styles.segmentMild : null,
                                  level === 'Moderate' ? styles.segmentModerate : null,
                                  level === 'Severe' ? styles.segmentSevere : null,
                                ]}
                                onPress={() => setNewAllergy({ ...newAllergy, severity: level })}
                              >
                                <Text
                                  allowFontScaling
                                  style={[
                                    styles.segmentPillText,
                                    level === 'None' ? styles.segmentNoneText : null,
                                    level === 'Mild' ? styles.segmentMildText : null,
                                    level === 'Moderate' ? styles.segmentModerateText : null,
                                    level === 'Severe' ? styles.segmentSevereText : null,
                                  ]}
                                >
                                  {level}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                          <View style={[styles.inlineActionRow, styles.severityButtonsRow]}>
                            <Pressable style={[styles.cancelTextButton, { backgroundColor: theme.background }]} onPress={closeAddForm}>
                              <Text allowFontScaling style={[styles.cancelTextButtonLabel, { color: theme.textSecondary }]}>Cancel</Text>
                            </Pressable>
                            <Pressable style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleAddAllergy} disabled={actionBusy}>
                              {actionBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text allowFontScaling style={styles.saveButtonLabel}>Save</Text>}
                            </Pressable>
                          </View>
                        </>
                      )}
                    </View>
                  </AnimatedInlineForm>
                </View>
              );
            }}
            ListFooterComponent={inlineError ? <Text allowFontScaling style={[styles.inlineErrorIOS, { color: theme.danger }]}>{inlineError}</Text> : null}
          />
        </KeyboardAvoidingView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenBackground: {
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  profileHeader: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileHeaderText: {
    flex: 1,
    gap: 2,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionAction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryList: {
    backgroundColor: '#FFFFFF',
  },
  summaryLine: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  summaryLineMiddle: {
    flex: 1,
    marginLeft: 10,
  },
  summaryLineRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    marginRight: 8,
  },
  summarySeparator: {
    height: 1,
    marginLeft: 16,
    backgroundColor: '#E5E5EA',
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLineLabel: {
    fontSize: 17,
    color: '#1C1C1E',
    fontWeight: '400',
  },
  summaryLineValue: {
    fontSize: 15,
    color: '#8E8E93',
    flexShrink: 1,
    textAlign: 'right',
  },
  summaryCountPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center',
    marginRight: 8,
    overflow: 'hidden',
    lineHeight: 22,
  },
  summaryCountConditions: {
    backgroundColor: '#FF2D55',
  },
  summaryCountMedications: {
    backgroundColor: '#007AFF',
  },
  summaryCountAllergies: {
    backgroundColor: '#FF9500',
  },
  summaryLoadingRow: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 33,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  heroEmail: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 17,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  editScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F2F2F7',
    zIndex: 50,
  },
  editScreenKeyboard: {
    flex: 1,
  },
  editHeader: {
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#C6C6C8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  editHeaderBackButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    color: '#1C1C1E',
  },
  editHeaderSpacer: {
    width: 44,
    height: 44,
  },
  editScroll: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  editContent: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  sectionGap: {
    height: 20,
  },
  groupLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  groupLabelAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  groupLabel: {
    fontSize: 13,
    color: '#6D6D72',
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  groupLabelCount: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 6,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
  },
  groupCardLast: {
    marginBottom: 22,
  },
  editRow: {
    height: 48,
    paddingLeft: 16,
    paddingRight: 8,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editRowDanger: {
    backgroundColor: '#FFECEC',
  },
  editRowText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
    color: '#1C1C1E',
  },
  editRowConfirmText: {
    flex: 1,
    fontSize: 15,
    color: '#D70015',
    fontWeight: '600',
  },
  deleteTouch: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPill: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  confirmPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelPill: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cancelPillText: {
    color: '#3A3A3C',
    fontSize: 12,
    fontWeight: '700',
  },
  addRow: {
    height: 48,
    paddingLeft: 16,
    paddingRight: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  addRowText: {
    fontSize: 17,
    lineHeight: 22,
    color: '#34C759',
    fontWeight: '400',
  },
  inlineFormBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  insetSeparator: {
    position: 'absolute',
    left: 16,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: '#C6C6C8',
  },
  inlineInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#C6C6C8',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1C1C1E',
    backgroundColor: '#FFFFFF',
  },
  stackedInput: {
    marginTop: 10,
  },
  inlineActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  severityButtonsRow: {
    marginTop: 10,
  },
  cancelTextButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelTextButtonLabel: {
    color: '#8E8E93',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
  },
  saveButton: {
    flex: 2,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  allergyRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  allergySeverityPill: {
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    borderWidth: 2,
  },
  allergySeverityNone: {
    backgroundColor: '#F2F2F7',
    borderColor: '#8E8E93',
  },
  allergySeverityMild: {
    backgroundColor: '#FFF9C4',
    borderColor: '#856404',
  },
  allergySeverityModerate: {
    backgroundColor: '#FFE0B2',
    borderColor: '#E65100',
  },
  allergySeveritySevere: {
    backgroundColor: '#FFEBEE',
    borderColor: '#C62828',
  },
  allergySeverityText: {
    fontSize: 13,
    lineHeight: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  severitySegmentRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  segmentPill: {
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  segmentPillActive: {
    borderWidth: 2,
  },
  segmentPillText: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
  },
  segmentNone: {
    backgroundColor: '#F2F2F7',
    borderColor: '#8E8E93',
  },
  segmentMild: {
    backgroundColor: '#FFF9C4',
    borderColor: '#856404',
  },
  segmentModerate: {
    backgroundColor: '#FFE0B2',
    borderColor: '#E65100',
  },
  segmentSevere: {
    backgroundColor: '#FFEBEE',
    borderColor: '#C62828',
  },
  segmentNoneText: {
    color: '#8E8E93',
  },
  segmentMildText: {
    color: '#856404',
  },
  segmentModerateText: {
    color: '#E65100',
  },
  segmentSevereText: {
    color: '#C62828',
  },
  inlineErrorIOS: {
    color: '#FF3B30',
    fontSize: 13,
    paddingHorizontal: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    minHeight: 58,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  modalHeaderButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  modalHeaderButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 14,
    gap: 12,
  },
  modalSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inlineFormWrap: {
    gap: 8,
    marginTop: 4,
  },
  inlineFormActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineCancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  inlineCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalEmpty: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  modalItemWrap: {
    gap: 6,
  },
  modalItemRow: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  modalAllergyTextWrap: {
    flex: 1,
    gap: 2,
  },
  modalItemSubText: {
    fontSize: 12,
  },
  deleteButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityChip: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  severityChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  confirmText: {
    flex: 1,
    fontSize: 12,
  },
  confirmAction: {
    minHeight: 32,
    justifyContent: 'center',
  },
  confirmActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineError: {
    fontSize: 13,
    marginTop: 4,
  },
  settingsRow: {
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  settingsSectionHeader: {
    fontSize: 13,
    textTransform: 'uppercase',
    color: '#6D6D72',
    paddingTop: 24,
    paddingBottom: 6,
    paddingHorizontal: 16,
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  settingsIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconBlue: {
    backgroundColor: '#007AFF',
  },
  settingsIconGray: {
    backgroundColor: '#8E8E93',
  },
  settingsTextWrap: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
  },
  settingsSubLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyText: {
    marginTop: 4,
    marginBottom: 4,
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 20,
  },
  errorText: {
    marginTop: 10,
    marginHorizontal: 4,
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  centerStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
