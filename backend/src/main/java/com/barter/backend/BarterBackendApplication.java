package com.barter.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BarterBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BarterBackendApplication.class, args);
		System.out.println("Server running on PORT 8081");
	}

}
