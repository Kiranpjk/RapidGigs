package com.rapidgigs.payments;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * Escrow contract between a client (job poster) and a hired freelancer.
 * Money is held per milestone and only released when the client approves the work.
 * shortcut: escrow is simulated (status only, no real money moves); plug in Stripe Connect before real payouts.
 */
@Document("contracts")
public class Contract {

    public enum Status { PENDING, FUNDED, SUBMITTED, RELEASED }

    public static class Milestone {
        public String title;
        public long amountCents;
        public Status status = Status.PENDING;
        public Instant updatedAt = Instant.now();

        public Milestone() {}
        public Milestone(String title, long amountCents) {
            this.title = title;
            this.amountCents = amountCents;
        }
    }

    @Id public String id;
    @Indexed(unique = true) public String applicationId;
    public String jobId;
    public String clientId;
    public String freelancerId;
    public String currency;
    public List<Milestone> milestones;
    public Instant createdAt = Instant.now();
    @Version public Long version; // optimistic lock: two parallel approvals can't both release

    public Contract() {}

    public Contract(String applicationId, String jobId, String clientId, String freelancerId,
                    String currency, List<Milestone> milestones) {
        if (clientId.equals(freelancerId)) throw new IllegalArgumentException("Client and freelancer must differ");
        if (milestones.isEmpty()) throw new IllegalArgumentException("At least one milestone required");
        for (Milestone m : milestones) {
            if (m.amountCents <= 0) throw new IllegalArgumentException("Milestone amount must be positive");
        }
        this.applicationId = applicationId;
        this.jobId = jobId;
        this.clientId = clientId;
        this.freelancerId = freelancerId;
        this.currency = currency;
        this.milestones = milestones;
    }

    public void fund(int i, String userId)    { move(i, userId, clientId, Status.PENDING, Status.FUNDED); }
    public void submit(int i, String userId)  { move(i, userId, freelancerId, Status.FUNDED, Status.SUBMITTED); }
    public void approve(int i, String userId) { move(i, userId, clientId, Status.SUBMITTED, Status.RELEASED); }
    /** Client asks for changes: money stays in escrow, freelancer can submit again. */
    public void reject(int i, String userId)  { move(i, userId, clientId, Status.SUBMITTED, Status.FUNDED); }

    public long escrowedCents() {
        return milestones.stream().filter(m -> m.status == Status.FUNDED || m.status == Status.SUBMITTED)
                .mapToLong(m -> m.amountCents).sum();
    }

    public long releasedCents() {
        return milestones.stream().filter(m -> m.status == Status.RELEASED).mapToLong(m -> m.amountCents).sum();
    }

    private void move(int i, String userId, String allowedUser, Status from, Status to) {
        if (i < 0 || i >= milestones.size()) throw new IllegalArgumentException("No milestone " + i);
        if (!allowedUser.equals(userId)) throw new SecurityException("Not allowed for this user");
        Milestone m = milestones.get(i);
        if (m.status != from) {
            throw new IllegalStateException("Milestone " + i + " is " + m.status + ", expected " + from);
        }
        m.status = to;
        m.updatedAt = Instant.now();
    }
}
