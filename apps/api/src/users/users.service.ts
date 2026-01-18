import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async create(data: {
    email: string;
    passwordHash?: string;
    name?: string;
    googleId?: string;
    avatarUrl?: string;
  }) {
    return this.prisma.user.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      avatarUrl: string;
      googleId: string;
    }>,
  ) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
