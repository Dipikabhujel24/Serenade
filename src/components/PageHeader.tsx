import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../theme.js";

type Props = {
	title: string;
	subtitle?: string;
	onBack: () => void;
};

export function PageHeader({ title, subtitle, onBack }: Props) {
	return (
		<TouchableOpacity style={styles.header} onPress={onBack} activeOpacity={0.8}>
			<Text style={styles.back}>←</Text>
			<View>
				<Text style={styles.title}>{title}</Text>
				{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: theme.colors.primary,
		borderRadius: theme.radii.lg,
		padding: theme.spacing.md,
		marginBottom: theme.spacing.lg,
	},
	back: {
		fontSize: 20,
		marginRight: 12,
		color: theme.colors.surface,
		fontWeight: theme.fontWeights.semi,
	},
	title: {
		fontSize: 16,
		fontWeight: theme.fontWeights.semi,
		color: theme.colors.surface,
	},
	subtitle: {
		fontSize: 12,
		color: "rgba(255,255,255,0.85)",
		marginTop: 2,
	},
});
