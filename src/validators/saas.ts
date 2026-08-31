import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const organizationNameSchema = z
  .string()
  .trim()
  .min(2, "Organization name must be at least 2 characters.")
  .max(80, "Organization name must be at most 80 characters.");

export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
});

export const updateOrganizationSchema = z.object({
  name: organizationNameSchema,
  logo: z.string().trim().max(500).optional().nullable(),
});

export const projectNameSchema = z
  .string()
  .trim()
  .min(2, "Project name must be at least 2 characters.")
  .max(80, "Project name must be at most 80 characters.");

export const projectDescriptionSchema = z.string().trim().max(2000).optional().nullable();

export const createProjectSchema = z.object({
  organizationId: z.string().min(1, "Choose an organization."),
  name: projectNameSchema,
  description: projectDescriptionSchema,
  icon: z.string().trim().max(16).optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema,
  icon: z.string().trim().max(16).optional().nullable(),
});

export const addOrganizationMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  roleId: z.string().min(1, "Choose a role."),
});

export const changeOrganizationMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  roleId: z.string().min(1, "Choose a role."),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1, "Choose a member."),
  roleId: z.string().min(1, "Choose a role."),
});

export const changeProjectMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  roleId: z.string().min(1, "Choose a role."),
});
