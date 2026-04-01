import { Test, TestingModule } from '@nestjs/testing';
import { LogsService } from './logs.service';
import { PrismaService } from 'src/prisma/prisma.service';

// A mock version of PrismaService — returns fake data instead of hitting the DB
const mockPrismaService = {
  logEntry: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};


describe('LogsService', () => {
  let service: LogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogsService, {
        provide: PrismaService,
        useValue: mockPrismaService
      }],
    }).compile();

    service = module.get<LogsService>(LogsService);

    // Reset all mocks before each test so they don't bleed into each other
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all the logs in the logs table', async () => {
      const mockEntries = [
        { id: 1, title: 'Entry 1', content: 'Content 1', tags: ['NestJS'], createdAt: new Date(), updatedAt: new Date() },
        { id: 2, title: 'Entry 2', content: 'Content 2', tags: ['AWS'], createdAt: new Date(), updatedAt: new Date() },
      ];

      mockPrismaService.logEntry.findMany.mockResolvedValue(mockEntries);

      const result = await service.findAll();

      expect(mockPrismaService.logEntry.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockEntries);
    })
  });


  describe('findOne', () => {
    it('should return a single log entry by id', async () => {
      const mockEntry = { id: 1, title: 'Entry 1', content: 'Content 1', tags: ['NestJS'], createdAt: new Date(), updatedAt: new Date() };

      mockPrismaService.logEntry.findUnique.mockResolvedValue(mockEntry);

      const result = await service.findOne(1);

      expect(mockPrismaService.logEntry.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockEntry);
    });
  });

  describe('create', () => {
    it('should create and return a new log entry', async () => {
      const input = { title: 'New Entry', content: 'Some content', tags: ['Docker'] };
      const mockCreated = { id: 3, ...input, createdAt: new Date(), updatedAt: new Date() };

      mockPrismaService.logEntry.create.mockResolvedValue(mockCreated);

      const result = await service.create(input);

      expect(mockPrismaService.logEntry.create).toHaveBeenCalledWith({ data: input });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('update', () => {
    it('should update and return the modified log entry', async () => {
      const mockUpdated = { id: 1, title: 'Updated', content: 'Content 1', tags: ['NestJS'], createdAt: new Date(), updatedAt: new Date() };

      mockPrismaService.logEntry.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, { title: 'Updated' });

      expect(mockPrismaService.logEntry.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'Updated' },
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('remove', () => {
    it('should delete a log entry by id', async () => {
      const mockDeleted = { id: 1, title: 'Entry 1', content: 'Content 1', tags: [], createdAt: new Date(), updatedAt: new Date() };

      mockPrismaService.logEntry.delete.mockResolvedValue(mockDeleted);

      const result = await service.remove(1);

      expect(mockPrismaService.logEntry.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockDeleted);
    });
  });

});
