import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LogsService {
    constructor(private readonly prisma : PrismaService) {}
        
    findAll() {
        return this.prisma.logEntry.findMany({
            orderBy: {
                createdAt: 'desc',
            }
        })
    }

    findOne(id: number) {
        return this.prisma.logEntry.findUnique({
            where : { id }
        })
    }

    create(data : { title: string; content: string; tags: string[] }) {
        return this.prisma.logEntry.create({data});
    }

    update(id: number,data : { title?: string; content?: string; tags?: string[] }) {
        return this.prisma.logEntry.update({
            where : {id},
            data 
        });
    }

    remove(id: number) {
    return this.prisma.logEntry.delete({
      where: { id },
    });
  }
}
