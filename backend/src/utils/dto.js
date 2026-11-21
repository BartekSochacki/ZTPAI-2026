function toUserDto(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    createdAt: row.created_at
  };
}

function toTrainerDto(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name
  };
}

function toMembershipDto(row) {
  const dto = {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at
  };
  if (row.user_email) {
    dto.user = { email: row.user_email, firstName: row.user_first_name, lastName: row.user_last_name };
  }
  return dto;
}

function toPaymentDto(row) {
  return {
    id: row.id,
    membershipId: row.membership_id,
    membershipType: row.membership_type,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    cardLast4: row.card_last4,
    failureCode: row.failure_code,
    createdAt: row.created_at
  };
}

function toRoomDto(row) {
  return { id: row.id, name: row.name, capacity: row.capacity };
}

function toClassTypeDto(row) {
  return { id: row.id, name: row.name, description: row.description };
}

function toSessionDto(row) {
  const enrolledCount = row.enrolled_count ?? 0;
  return {
    id: row.id,
    classType: { id: row.class_type_id, name: row.class_type_name },
    trainer: { id: row.trainer_id, firstName: row.trainer_first_name, lastName: row.trainer_last_name },
    room: { id: row.room_id, name: row.room_name },
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    status: row.status,
    version: row.version,
    enrolledCount,
    waitlistCount: row.waitlist_count ?? 0,
    freeSpots: Math.max(0, row.capacity - enrolledCount)
  };
}

function toEnrollmentDto(row) {
  const dto = {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    status: row.status,
    waitlistPosition: row.status === 'WAITLISTED' ? row.waitlist_position ?? null : null,
    createdAt: row.created_at
  };
  if (row.starts_at) {
    dto.session = {
      id: row.session_id,
      classTypeName: row.class_type_name,
      roomName: row.room_name,
      trainerName: `${row.trainer_first_name} ${row.trainer_last_name}`,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.session_status
    };
  }
  return dto;
}

function toParticipantDto(row) {
  return {
    enrollmentId: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    status: row.status,
    enrolledAt: row.created_at
  };
}

module.exports = {
  toUserDto,
  toTrainerDto,
  toMembershipDto,
  toPaymentDto,
  toRoomDto,
  toClassTypeDto,
  toSessionDto,
  toEnrollmentDto,
  toParticipantDto
};
