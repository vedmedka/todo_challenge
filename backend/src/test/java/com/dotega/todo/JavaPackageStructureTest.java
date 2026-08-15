package com.dotega.todo;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

class JavaPackageStructureTest {
    private final JavaClasses classes = new ClassFileImporter()
        .withImportOption(new ImportOption.DoNotIncludeTests())
        .importPackages("com.dotega.todo");

    @Test
    void keepsDomainIndependentOfFrameworksAndPersistence() {
        classes()
            .that()
            .resideInAPackage("..domain..")
            .should()
            .onlyDependOnClassesThat()
            .resideOutsideOfPackages(
                "org.springframework..",
                "java.sql..",
                "javax.sql..",
                "org.springframework.jdbc..")
            .check(classes);
    }

    @Test
    void keepsWebLayerAwayFromJdbcPersistence() {
        classes()
            .that()
            .resideInAPackage("..web..")
            .should()
            .onlyDependOnClassesThat()
            .resideOutsideOfPackages("..persistence..", "org.springframework.jdbc..", "java.sql..", "javax.sql..")
            .check(classes);
    }

    @Test
    void keepsApplicationLayerIndependentOfWebAndJdbcPersistence() {
        classes()
            .that()
            .resideInAPackage("..application..")
            .should()
            .onlyDependOnClassesThat()
            .resideOutsideOfPackages("..web..", "..persistence..", "org.springframework.jdbc..", "java.sql..", "javax.sql..")
            .check(classes);
    }
}
