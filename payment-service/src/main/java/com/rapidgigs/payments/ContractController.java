package com.rapidgigs.payments;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

interface ContractRepository extends MongoRepository<Contract, String> {
    Optional<Contract> findByApplicationId(String applicationId);
    List<Contract> findByClientIdOrFreelancerId(String clientId, String freelancerId);
}

/** Called only by the Node backend, which has already checked the JWT and passes the user in X-User-Id. */
@RestController
@RequestMapping("/contracts")
public class ContractController {

    record MilestoneIn(@NotBlank @Size(max = 200) String title, @Positive long amountCents) {}

    record CreateContract(@NotBlank String applicationId, @NotBlank String jobId,
                          @NotBlank String freelancerId,
                          @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency,
                          @NotEmpty @Size(max = 20) List<@Valid MilestoneIn> milestones) {}

    private final ContractRepository repo;

    ContractController(ContractRepository repo) { this.repo = repo; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Contract create(@RequestHeader("X-User-Id") String userId, @Valid @RequestBody CreateContract in) {
        var milestones = in.milestones().stream().map(m -> new Contract.Milestone(m.title(), m.amountCents())).toList();
        try {
            return repo.save(new Contract(in.applicationId(), in.jobId(), userId, in.freelancerId(),
                    in.currency(), new java.util.ArrayList<>(milestones)));
        } catch (DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Contract already exists for this application");
        }
    }

    @GetMapping
    List<Contract> mine(@RequestHeader("X-User-Id") String userId) {
        return repo.findByClientIdOrFreelancerId(userId, userId);
    }

    @GetMapping("/{id}")
    Contract get(@RequestHeader("X-User-Id") String userId, @PathVariable String id) {
        Contract c = load(id);
        if (!userId.equals(c.clientId) && !userId.equals(c.freelancerId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND); // don't reveal other people's contracts
        }
        return c;
    }

    @PostMapping("/{id}/milestones/{index}/{action}")
    Contract act(@RequestHeader("X-User-Id") String userId, @PathVariable String id,
                 @PathVariable int index, @PathVariable String action) {
        Contract c = load(id);
        switch (action) {
            case "fund" -> c.fund(index, userId);
            case "submit" -> c.submit(index, userId);
            case "approve" -> c.approve(index, userId);
            case "reject" -> c.reject(index, userId);
            default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown action " + action);
        }
        return repo.save(c);
    }

    private Contract load(String id) {
        return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String, String>> badRequest(Exception e) { return err(HttpStatus.BAD_REQUEST, e); }

    @ExceptionHandler(SecurityException.class)
    ResponseEntity<Map<String, String>> forbidden(Exception e) { return err(HttpStatus.FORBIDDEN, e); }

    @ExceptionHandler({IllegalStateException.class, OptimisticLockingFailureException.class})
    ResponseEntity<Map<String, String>> conflict(Exception e) { return err(HttpStatus.CONFLICT, e); }

    private static ResponseEntity<Map<String, String>> err(HttpStatus s, Exception e) {
        return ResponseEntity.status(s).body(Map.of("error", String.valueOf(e.getMessage())));
    }
}
