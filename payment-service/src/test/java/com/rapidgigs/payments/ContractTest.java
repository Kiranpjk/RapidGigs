package com.rapidgigs.payments;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ContractTest {

    private Contract contract() {
        return new Contract("app1", "job1", "client", "freelancer", "EUR", new ArrayList<>(List.of(
                new Contract.Milestone("Design", 10_000),
                new Contract.Milestone("Build", 25_000))));
    }

    @Test
    void happyPathReleasesMoney() {
        Contract c = contract();
        c.fund(0, "client");
        assertEquals(10_000, c.escrowedCents());
        c.submit(0, "freelancer");
        c.approve(0, "client");
        assertEquals(0, c.escrowedCents());
        assertEquals(10_000, c.releasedCents());
    }

    @Test
    void rejectKeepsMoneyInEscrowAndAllowsResubmit() {
        Contract c = contract();
        c.fund(1, "client");
        c.submit(1, "freelancer");
        c.reject(1, "client");
        assertEquals(25_000, c.escrowedCents());
        c.submit(1, "freelancer");
        assertEquals(Contract.Status.SUBMITTED, c.milestones.get(1).status);
    }

    @Test
    void wrongUserOrOrderIsRefused() {
        Contract c = contract();
        assertThrows(SecurityException.class, () -> c.fund(0, "freelancer"));
        assertThrows(IllegalStateException.class, () -> c.approve(0, "client"));   // not submitted
        assertThrows(IllegalStateException.class, () -> c.submit(0, "freelancer")); // not funded
        c.fund(0, "client");
        c.submit(0, "freelancer");
        assertThrows(SecurityException.class, () -> c.approve(0, "freelancer"));    // can't pay yourself
        assertThrows(IllegalArgumentException.class, () -> c.fund(5, "client"));
    }

    @Test
    void invalidContractsAreRefused() {
        assertThrows(IllegalArgumentException.class, () ->
                new Contract("a", "j", "same", "same", "EUR", List.of(new Contract.Milestone("x", 1))));
        assertThrows(IllegalArgumentException.class, () ->
                new Contract("a", "j", "c", "f", "EUR", List.of(new Contract.Milestone("x", 0))));
    }
}
