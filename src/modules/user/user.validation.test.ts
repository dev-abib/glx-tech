import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
  userRoleEnumValues,
} from "./user.validation.js";

describe("User Role Validation & Normalization", () => {
  const baseRegistration = {
    name: "John Doe",
    email: "john@example.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  it("should validate and normalize all 11 user roles in createUserSchema", () => {
    const rolesToTest = [
      { input: "Buyer", expected: "buyer" },
      { input: "Seller", expected: "seller" },
      { input: "Renter", expected: "renter" },
      { input: "Real Estate Agent", expected: "real_estate_agent" },
      { input: "Brokerage", expected: "brokerage" },
      { input: "Practitioner", expected: "practitioner" },
      { input: "Home Explorer", expected: "home_explorer" },
      { input: "Homeowner", expected: "homeowner" },
      { input: "Investor", expected: "investor" },
      { input: "Interior Designer", expected: "interior_designer" },
      { input: "Architect", expected: "architect" },
    ];

    for (const { input, expected } of rolesToTest) {
      const result = createUserSchema.parse({
        ...baseRegistration,
        userRole: input,
      });
      expect(result.userRole).toBe(expected);
    }
  });

  it("should accept user_role field alias in createUserSchema", () => {
    const result = createUserSchema.parse({
      ...baseRegistration,
      user_role: "Real Estate Agent",
    });
    expect(result.userRole).toBe("real_estate_agent");
  });

  it("should validate and normalize userRole in updateUserSchema", () => {
    const result = updateUserSchema.parse({
      name: "Jane Doe",
      user_role: "Interior Designer",
    });
    expect(result.userRole).toBe("interior_designer");
  });

  it("should fail for invalid user roles", () => {
    expect(() =>
      createUserSchema.parse({
        ...baseRegistration,
        userRole: "Astronaut",
      })
    ).toThrow();
  });

  it("should list all 11 roles in userRoleEnumValues", () => {
    expect(userRoleEnumValues).toEqual([
      "buyer",
      "seller",
      "renter",
      "real_estate_agent",
      "brokerage",
      "practitioner",
      "home_explorer",
      "homeowner",
      "investor",
      "interior_designer",
      "architect",
    ]);
  });
});
