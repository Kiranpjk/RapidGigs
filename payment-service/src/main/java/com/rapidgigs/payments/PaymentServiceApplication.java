package com.rapidgigs.payments;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@SpringBootApplication
public class PaymentServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }

    /** Only the Node backend knows the shared key, so X-User-Id can be trusted. */
    @Component
    static class InternalKeyFilter extends OncePerRequestFilter {
        private final byte[] key;

        InternalKeyFilter(@Value("${internal.key}") String key) {
            if (key.isBlank()) throw new IllegalStateException("PAYMENT_SERVICE_KEY must be set");
            this.key = key.getBytes(StandardCharsets.UTF_8);
        }

        @Override
        protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                throws ServletException, IOException {
            if (req.getRequestURI().equals("/health")) { res.getWriter().write("ok"); return; }
            String given = req.getHeader("X-Internal-Key");
            if (given == null || !MessageDigest.isEqual(key, given.getBytes(StandardCharsets.UTF_8))) {
                res.sendError(401);
                return;
            }
            chain.doFilter(req, res);
        }
    }
}
