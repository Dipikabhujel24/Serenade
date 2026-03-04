import { Platform } from "react-native";

export const theme = {
	colors: {
		background: "#F5EEFF",
		backgroundAlt: "#FFF0F8",
		surface: "#FFFFFF",
		surfaceMuted: "#F8F0FF",
		primary: "#9333EA",
		primaryDark: "#7C22C9",
		accent: "#EC4899",
		text: "#2E1B4B",
		textSecondary: "#5B4B7A",
		textMuted: "#7C6B94",
		success: "#10B981",
		successDark: "#059669",
		danger: "#EF4444",
		dangerBright: "#F43F5E",
		warning: "#F59E0B",
		border: "#E9D5FF",
		borderLight: "#F3E8FF",
	},
	radii: {
		sm: 10,
		md: 14,
		lg: 18,
		xl: 22,
		full: 999,
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 14,
		lg: 18,
		xl: 24,
		xxl: 32,
	},
	fontWeights: {
		regular: "400" as const,
		medium: "500" as const,
		semi: "600" as const,
		bold: "700" as const,
	},
	shadows: {
		card:
			Platform.OS === "ios"
				? {
						shadowColor: "#5C5666",
						shadowOffset: { width: 0, height: 2 },
						shadowOpacity: 0.06,
						shadowRadius: 8,
					}
				: { elevation: 3 },
		button:
			Platform.OS === "ios"
				? {
						shadowColor: "#5C5666",
						shadowOffset: { width: 0, height: 3 },
						shadowOpacity: 0.08,
						shadowRadius: 6,
					}
				: { elevation: 4 },
	},
};
