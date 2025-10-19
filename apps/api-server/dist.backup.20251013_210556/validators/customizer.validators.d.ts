/**
 * Customizer Settings Validators (Zod Schemas)
 * Validates request payloads for customizer API endpoints
 */
import { z } from 'zod';
export declare const ScrollToTopSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    displayType: z.ZodDefault<z.ZodEnum<["desktop", "mobile", "both"]>>;
    threshold: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    backgroundColor: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    iconColor: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    position: z.ZodDefault<z.ZodOptional<z.ZodEnum<["left", "right"]>>>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean;
    threshold?: number;
    position?: "left" | "right";
    backgroundColor?: string;
    displayType?: "mobile" | "desktop" | "both";
    iconColor?: string;
}, {
    enabled?: boolean;
    threshold?: number;
    position?: "left" | "right";
    backgroundColor?: string;
    displayType?: "mobile" | "desktop" | "both";
    iconColor?: string;
}>;
export type ScrollToTopInput = z.infer<typeof ScrollToTopSchema>;
/**
 * Button Variants Schema
 */
export declare const ButtonSettingsSchema: z.ZodObject<{
    primary: z.ZodObject<{
        backgroundColor: z.ZodString;
        textColor: z.ZodString;
        borderWidth: z.ZodNumber;
        borderColor: z.ZodString;
        borderStyle: z.ZodEnum<["solid", "dashed", "dotted", "double", "none"]>;
        borderRadius: z.ZodNumber;
        paddingVertical: z.ZodNumber;
        paddingHorizontal: z.ZodNumber;
        hoverBackgroundColor: z.ZodString;
        hoverTextColor: z.ZodString;
        hoverBorderColor: z.ZodString;
        hoverTransform: z.ZodOptional<z.ZodEnum<["none", "scale", "translateY"]>>;
        transitionDuration: z.ZodNumber;
        fontFamily: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodObject<{
            desktop: z.ZodNumber;
            tablet: z.ZodNumber;
            mobile: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        }, {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        }>;
        fontWeight: z.ZodUnion<[z.ZodLiteral<100>, z.ZodLiteral<200>, z.ZodLiteral<300>, z.ZodLiteral<400>, z.ZodLiteral<500>, z.ZodLiteral<600>, z.ZodLiteral<700>, z.ZodLiteral<800>, z.ZodLiteral<900>]>;
        textTransform: z.ZodEnum<["none", "capitalize", "uppercase", "lowercase"]>;
        letterSpacing: z.ZodNumber;
        boxShadow: z.ZodOptional<z.ZodEnum<["none", "small", "medium", "large"]>>;
        hoverBoxShadow: z.ZodOptional<z.ZodEnum<["none", "small", "medium", "large"]>>;
    }, "strip", z.ZodTypeAny, {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    }, {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    }>;
    secondary: z.ZodOptional<z.ZodObject<{
        backgroundColor: z.ZodOptional<z.ZodString>;
        textColor: z.ZodOptional<z.ZodString>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        borderColor: z.ZodOptional<z.ZodString>;
        borderStyle: z.ZodOptional<z.ZodEnum<["solid", "dashed", "dotted", "double", "none"]>>;
        borderRadius: z.ZodOptional<z.ZodNumber>;
        paddingVertical: z.ZodOptional<z.ZodNumber>;
        paddingHorizontal: z.ZodOptional<z.ZodNumber>;
        hoverBackgroundColor: z.ZodOptional<z.ZodString>;
        hoverTextColor: z.ZodOptional<z.ZodString>;
        hoverBorderColor: z.ZodOptional<z.ZodString>;
        hoverTransform: z.ZodOptional<z.ZodOptional<z.ZodEnum<["none", "scale", "translateY"]>>>;
        transitionDuration: z.ZodOptional<z.ZodNumber>;
        fontFamily: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        fontSize: z.ZodOptional<z.ZodObject<{
            desktop: z.ZodNumber;
            tablet: z.ZodNumber;
            mobile: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        }, {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        }>>;
        fontWeight: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<100>, z.ZodLiteral<200>, z.ZodLiteral<300>, z.ZodLiteral<400>, z.ZodLiteral<500>, z.ZodLiteral<600>, z.ZodLiteral<700>, z.ZodLiteral<800>, z.ZodLiteral<900>]>>;
        textTransform: z.ZodOptional<z.ZodEnum<["none", "capitalize", "uppercase", "lowercase"]>>;
        letterSpacing: z.ZodOptional<z.ZodNumber>;
        boxShadow: z.ZodOptional<z.ZodOptional<z.ZodEnum<["none", "small", "medium", "large"]>>>;
        hoverBoxShadow: z.ZodOptional<z.ZodOptional<z.ZodEnum<["none", "small", "medium", "large"]>>>;
    }, "strip", z.ZodTypeAny, {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    }, {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    }>>;
    outline: z.ZodOptional<z.ZodObject<{
        backgroundColor: z.ZodOptional<z.ZodString>;
        textColor: z.ZodOptional<z.ZodString>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        borderColor: z.ZodOptional<z.ZodString>;
        borderStyle: z.ZodOptional<z.ZodEnum<["solid", "dashed", "dotted", "double", "none"]>>;
        borderRadius: z.ZodOptional<z.ZodNumber>;
        paddingVertical: z.ZodOptional<z.ZodNumber>;
        paddingHorizontal: z.ZodOptional<z.ZodNumber>;
        hoverBackgroundColor: z.ZodOptional<z.ZodString>;
        hoverTextColor: z.ZodOptional<z.ZodString>;
        hoverBorderColor: z.ZodOptional<z.ZodString>;
        hoverTransform: z.ZodOptional<z.ZodOptional<z.ZodEnum<["none", "scale", "translateY"]>>>;
        transitionDuration: z.ZodOptional<z.ZodNumber>;
        fontFamily: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        fontSize: z.ZodOptional<z.ZodObject<{
            desktop: z.ZodNumber;
            tablet: z.ZodNumber;
            mobile: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        }, {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        }>>;
        fontWeight: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<100>, z.ZodLiteral<200>, z.ZodLiteral<300>, z.ZodLiteral<400>, z.ZodLiteral<500>, z.ZodLiteral<600>, z.ZodLiteral<700>, z.ZodLiteral<800>, z.ZodLiteral<900>]>>;
        textTransform: z.ZodOptional<z.ZodEnum<["none", "capitalize", "uppercase", "lowercase"]>>;
        letterSpacing: z.ZodOptional<z.ZodNumber>;
        boxShadow: z.ZodOptional<z.ZodOptional<z.ZodEnum<["none", "small", "medium", "large"]>>>;
        hoverBoxShadow: z.ZodOptional<z.ZodOptional<z.ZodEnum<["none", "small", "medium", "large"]>>>;
    }, "strip", z.ZodTypeAny, {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    }, {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    }>>;
    text: z.ZodOptional<z.ZodObject<{
        backgroundColor: z.ZodOptional<z.ZodString>;
        textColor: z.ZodOptional<z.ZodString>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        borderColor: z.ZodOptional<z.ZodString>;
        borderStyle: z.ZodOptional<z.ZodEnum<["solid", "dashed", "dotted", "double", "none"]>>;
        borderRadius: z.ZodOptional<z.ZodNumber>;
        paddingVertical: z.ZodOptional<z.ZodNumber>;
        paddingHorizontal: z.ZodOptional<z.ZodNumber>;
        hoverBackgroundColor: z.ZodOptional<z.ZodString>;
        hoverTextColor: z.ZodOptional<z.ZodString>;
        hoverBorderColor: z.ZodOptional<z.ZodString>;
        hoverTransform: z.ZodOptional<z.ZodOptional<z.ZodEnum<["none", "scale", "translateY"]>>>;
        transitionDuration: z.ZodOptional<z.ZodNumber>;
        fontFamily: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        fontSize: z.ZodOptional<z.ZodObject<{
            desktop: z.ZodNumber;
            tablet: z.ZodNumber;
            mobile: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        }, {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        }>>;
        fontWeight: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<100>, z.ZodLiteral<200>, z.ZodLiteral<300>, z.ZodLiteral<400>, z.ZodLiteral<500>, z.ZodLiteral<600>, z.ZodLiteral<700>, z.ZodLiteral<800>, z.ZodLiteral<900>]>>;
        textTransform: z.ZodOptional<z.ZodEnum<["none", "capitalize", "uppercase", "lowercase"]>>;
        letterSpacing: z.ZodOptional<z.ZodNumber>;
        boxShadow: z.ZodOptional<z.ZodOptional<z.ZodEnum<["none", "small", "medium", "large"]>>>;
        hoverBoxShadow: z.ZodOptional<z.ZodOptional<z.ZodEnum<["none", "small", "medium", "large"]>>>;
    }, "strip", z.ZodTypeAny, {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    }, {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    }>>;
    global: z.ZodOptional<z.ZodObject<{
        minHeight: z.ZodOptional<z.ZodNumber>;
        minWidth: z.ZodOptional<z.ZodNumber>;
        displayType: z.ZodOptional<z.ZodEnum<["inline-block", "block", "inline-flex"]>>;
        iconSpacing: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        displayType?: "block" | "inline-block" | "inline-flex";
        minHeight?: number;
        minWidth?: number;
        iconSpacing?: number;
    }, {
        displayType?: "block" | "inline-block" | "inline-flex";
        minHeight?: number;
        minWidth?: number;
        iconSpacing?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    text?: {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    };
    primary?: {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    };
    secondary?: {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    };
    outline?: {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    };
    global?: {
        displayType?: "block" | "inline-block" | "inline-flex";
        minHeight?: number;
        minWidth?: number;
        iconSpacing?: number;
    };
}, {
    text?: {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    };
    primary?: {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    };
    secondary?: {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    };
    outline?: {
        backgroundColor?: string;
        fontSize?: {
            mobile?: number;
            desktop?: number;
            tablet?: number;
        };
        fontFamily?: string;
        fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
        textColor?: string;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: "none" | "double" | "solid" | "dashed" | "dotted";
        paddingVertical?: number;
        paddingHorizontal?: number;
        hoverBackgroundColor?: string;
        hoverTextColor?: string;
        hoverBorderColor?: string;
        hoverTransform?: "none" | "scale" | "translateY";
        transitionDuration?: number;
        textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
        letterSpacing?: number;
        boxShadow?: "none" | "small" | "medium" | "large";
        hoverBoxShadow?: "none" | "small" | "medium" | "large";
    };
    global?: {
        displayType?: "block" | "inline-block" | "inline-flex";
        minHeight?: number;
        minWidth?: number;
        iconSpacing?: number;
    };
}>;
export type ButtonSettingsInput = z.infer<typeof ButtonSettingsSchema>;
export declare const BreadcrumbsSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    position: z.ZodDefault<z.ZodEnum<["above-content", "below-header"]>>;
    homeText: z.ZodDefault<z.ZodString>;
    separator: z.ZodDefault<z.ZodEnum<[">", "/", "→", "•", "|"]>>;
    showCurrentPage: z.ZodDefault<z.ZodBoolean>;
    showOnHomepage: z.ZodDefault<z.ZodBoolean>;
    linkColor: z.ZodDefault<z.ZodString>;
    currentPageColor: z.ZodDefault<z.ZodString>;
    separatorColor: z.ZodDefault<z.ZodString>;
    hoverColor: z.ZodDefault<z.ZodString>;
    fontSize: z.ZodDefault<z.ZodObject<{
        desktop: z.ZodNumber;
        tablet: z.ZodNumber;
        mobile: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        mobile?: number;
        desktop?: number;
        tablet?: number;
    }, {
        mobile?: number;
        desktop?: number;
        tablet?: number;
    }>>;
    fontWeight: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<100>, z.ZodLiteral<200>, z.ZodLiteral<300>, z.ZodLiteral<400>, z.ZodLiteral<500>, z.ZodLiteral<600>, z.ZodLiteral<700>, z.ZodLiteral<800>, z.ZodLiteral<900>]>>;
    textTransform: z.ZodDefault<z.ZodEnum<["none", "capitalize", "uppercase", "lowercase"]>>;
    itemSpacing: z.ZodDefault<z.ZodNumber>;
    marginTop: z.ZodDefault<z.ZodNumber>;
    marginBottom: z.ZodDefault<z.ZodNumber>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    showIcons: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    mobileHidden: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean;
    maxLength?: number;
    position?: "above-content" | "below-header";
    fontSize?: {
        mobile?: number;
        desktop?: number;
        tablet?: number;
    };
    fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
    textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
    homeText?: string;
    separator?: "/" | ">" | "→" | "•" | "|";
    showCurrentPage?: boolean;
    showOnHomepage?: boolean;
    linkColor?: string;
    currentPageColor?: string;
    separatorColor?: string;
    hoverColor?: string;
    itemSpacing?: number;
    marginTop?: number;
    marginBottom?: number;
    showIcons?: boolean;
    mobileHidden?: boolean;
}, {
    enabled?: boolean;
    maxLength?: number;
    position?: "above-content" | "below-header";
    fontSize?: {
        mobile?: number;
        desktop?: number;
        tablet?: number;
    };
    fontWeight?: 100 | 200 | 500 | 400 | 300 | 800 | 600 | 900 | 700;
    textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
    homeText?: string;
    separator?: "/" | ">" | "→" | "•" | "|";
    showCurrentPage?: boolean;
    showOnHomepage?: boolean;
    linkColor?: string;
    currentPageColor?: string;
    separatorColor?: string;
    hoverColor?: string;
    itemSpacing?: number;
    marginTop?: number;
    marginBottom?: number;
    showIcons?: boolean;
    mobileHidden?: boolean;
}>;
export type BreadcrumbsInput = z.infer<typeof BreadcrumbsSchema>;
//# sourceMappingURL=customizer.validators.d.ts.map