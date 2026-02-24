import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEMO_USERS, DEMO_PRODUCTION, DEMO_ELEMENTS, DEMO_OPTIONS } from './seed-data.js';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('Seeding database...');

  // Create users
  const users = [];
  for (const userData of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        name: userData.name,
        email: userData.email,
        passwordHash,
        emailVerified: true,
      },
    });
    users.push({ ...user, role: userData.role, title: userData.title });
    console.log(`  Created user: ${user.name} (${user.email})`);
  }

  // Create production
  const production = await prisma.production.create({
    data: {
      title: DEMO_PRODUCTION.title,
      description: DEMO_PRODUCTION.description,
      createdById: users[0].id,
    },
  });
  console.log(`  Created production: ${production.title}`);

  // Add members
  for (const user of users) {
    await prisma.productionMember.create({
      data: {
        productionId: production.id,
        userId: user.id,
        role: user.role,
        title: user.title,
      },
    });
    console.log(`  Added member: ${user.name} as ${user.role}`);
  }

  // Create a dummy script record (no actual PDF)
  const script = await prisma.script.create({
    data: {
      productionId: production.id,
      title: 'The Midnight Garden - Draft 1',
      fileName: 'midnight-garden-draft1.pdf',
      s3Key: 'demo/midnight-garden-draft1.pdf',
      pageCount: 10,
      status: 'READY',
      uploadedById: users[0].id,
    },
  });
  console.log(`  Created script: ${script.title}`);

  // Create elements
  const elements = [];
  for (const elementData of DEMO_ELEMENTS) {
    const element = await prisma.element.create({
      data: {
        scriptId: script.id,
        name: elementData.name,
        type: elementData.type,
        highlightPage: elementData.highlightPage,
        highlightText: elementData.highlightText,
        source: 'MANUAL',
      },
    });
    elements.push(element);
    console.log(`  Created element: ${element.name} (${element.type})`);
  }

  // Create options
  for (const optionData of DEMO_OPTIONS) {
    const option = await prisma.option.create({
      data: {
        elementId: elements[optionData.elementIndex].id,
        mediaType: optionData.mediaType,
        description: optionData.description,
        externalUrl: optionData.externalUrl,
        readyForReview: true,
        uploadedById: users[2].id, // Crew member uploads
      },
    });
    console.log(`  Created option for ${elements[optionData.elementIndex].name}: ${option.description?.slice(0, 40)}...`);

    // Director approves the first option (ELENA)
    if (optionData.elementIndex === 0) {
      await prisma.approval.create({
        data: {
          optionId: option.id,
          userId: users[0].id, // Director
          decision: 'APPROVED',
          note: 'Perfect casting choice!',
        },
      });
      console.log(`  Director approved option for ${elements[0].name}`);
    }
  }

  console.log('\nSeed complete!');
  console.log(`  Users: ${users.length}`);
  console.log(`  Production: ${production.title}`);
  console.log(`  Elements: ${elements.length}`);
  console.log(`  Options: ${DEMO_OPTIONS.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
