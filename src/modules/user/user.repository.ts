import { PrismaClient, User, Role } from "@prisma/client";
import { ApiError } from "../../utils/api-error.js";
import { CreateUserInput } from "./user.validation.js";
import { hashPassword } from "../../utils/hash.js";
import { AuthHelper } from "../../helpers/auth-helpers.js";
import { JwtPayload } from "jsonwebtoken";

const prisma = new PrismaClient();
const auth = new AuthHelper();

export class UserRepository {
  async findUser(
    type: "id" | "email",
    payload: string,
    isReturnUser: true
  ): Promise<User>;
  async findUser(
    type: "id" | "email",
    payload: string,
    isReturnUser?: false
  ): Promise<void>;

  async findUser(
    type: "id" | "email",
    payload: string,
    isReturnUser: boolean = false
  ): Promise<User | void> {
    const user = await prisma.user.findUnique({
      where: type === "id" ? { id: payload } : { email: payload },
    });

    if (isReturnUser) {
      if (!user) throw new ApiError(404, "User not found");
      return user;
    } else {
      if (user) throw new ApiError(409, "User already exists");
      return;
    }
  }

  async createUser(data: CreateUserInput) {
    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role as Role,
        phone: data.phone,
      },
    });

    const payload: JwtPayload = {
      name: user.name as string,
      email: user.email as string,
      id: user.id,
      role: user.role as Role,
    };

    const accessToken = auth.generateToken(
      payload,
      user.role as Role,
      "access"
    );
    const refreshToken = auth.generateToken(
      payload,
      user.role as Role,
      "refresh"
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        accessToken: auth.hashToken(accessToken),
        refreshToken: auth.hashToken(refreshToken),
      },
    });
  }
}
