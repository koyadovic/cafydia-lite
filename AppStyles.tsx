import { StyleSheet, Platform, StatusBar } from 'react-native';

export const colors = {
    background: '#F4F6FB',
    card: '#FFFFFF',
    primary: '#4F46E5',
    primaryDark: '#3730A3',
    primaryLight: '#EEF2FF',
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    divider: '#F3F4F6',
    danger: '#EF4444',
    dangerBg: '#FEE2E2',
};

const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
};

const shadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 0,
};

const hairline = {
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.05)',
};

const topInset = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 44;

export const appStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: topInset + spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTextWrap: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        ...hairline,
        ...shadow,
    },
    settingsEmoji: {
        fontSize: 20,
    },
    scrollContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xl,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...hairline,
        ...shadow,
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: spacing.sm + 2,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.xs,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentActive: {
        backgroundColor: colors.card,
        ...hairline,
    },
    segmentEmoji: {
        fontSize: 22,
    },
    segmentLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 2,
    },
    segmentLabelActive: {
        color: colors.primary,
    },
    inputRow: {
        flexDirection: 'row',
    },
    inputCol: {
        flex: 1,
    },
    inputColSpacer: {
        width: spacing.sm + 4,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.xs + 2,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md - 2,
        paddingVertical: Platform.OS === 'ios' ? spacing.sm + 4 : spacing.sm,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    secondaryButton: {
        backgroundColor: colors.primaryLight,
        borderRadius: radius.md,
        paddingVertical: spacing.sm + 4,
        alignItems: 'center',
        marginTop: spacing.sm + 4,
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    foodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: radius.md,
        padding: spacing.sm + 4,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    foodIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm + 4,
    },
    foodIconText: {
        fontSize: 18,
    },
    foodInfo: {
        flex: 1,
    },
    foodPrimary: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    foodSecondary: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.dangerBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteText: {
        fontSize: 14,
    },
    emptyList: {
        textAlign: 'center',
        paddingVertical: spacing.lg,
        color: colors.textMuted,
        fontSize: 14,
        fontStyle: 'italic',
    },
    totalCarbs: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.primaryLight,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md - 2,
        paddingVertical: spacing.sm + 4,
        marginTop: spacing.xs,
    },
    totalCarbsLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
    },
    totalCarbsValue: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.primary,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        paddingVertical: spacing.md - 2,
        alignItems: 'center',
        marginTop: spacing.sm,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 1,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        paddingTop: topInset + spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    modalClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCloseText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    modalContent: {
        padding: spacing.md,
        paddingBottom: spacing.xl,
    },
    sectionGroup: {
        marginBottom: spacing.md,
    },
    sectionGroupTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginLeft: spacing.sm + 4,
        marginBottom: spacing.sm,
    },
    configCard: {
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.md - 2,
        ...hairline,
        ...shadow,
    },
    configItem: {
        paddingVertical: spacing.sm + 2,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    configItemLast: {
        borderBottomWidth: 0,
    },
    configRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    configTexts: {
        flex: 1,
        paddingRight: spacing.sm,
    },
    configLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    configHelp: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    configInput: {
        width: 90,
        backgroundColor: colors.background,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs + 2,
        fontSize: 15,
        color: colors.text,
        textAlign: 'right',
        fontWeight: '700',
    },
    modalFooter: {
        padding: spacing.md,
        paddingBottom: spacing.lg,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    resultBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.55)',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
    },
    resultCard: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.lg,
    },
    resultScroll: {
        maxHeight: '90%',
        flexGrow: 0,
        borderRadius: radius.xl,
    },
    resultTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    resultSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.md - 2,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        backgroundColor: colors.background,
    },
    resultRowAccent: {
        backgroundColor: colors.primaryLight,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    resultLabelAccent: {
        color: colors.primary,
    },
    resultValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    resultValue: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    resultValueAccent: {
        color: colors.primary,
    },
    resultUnit: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    pendingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm + 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    pendingText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '600',
    },
    pendingAction: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '700',
    },
    proposalHelp: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: spacing.md,
        lineHeight: 18,
    },
    proposalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    proposalValue: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    disabledButton: {
        opacity: 0.45,
    },
    spacedLabel: {
        marginTop: spacing.md,
    },
});
