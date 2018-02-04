class FeatureMatrixModel {
  constructor(cohort) {
      this.cohort = cohort;

      this.featureVcfData = [];
      this.rankedVariants = [];
      this.warning = "";

      this.inProgress = {
        loadingVariants: false,
        rankingVariants: false
      }


      this.matrixRows = [
        {name:'Harmful variant'              , id:'harmfulVariant', order:0, index:12,  match: 'exact', attribute: 'harmfulVariantLevel',     map: this.getTranslator().harmfulVariantMap },
        {name:'Pathogenicity - ClinVar'      , id:'clinvar',        order:1, index:2,   match: 'exact', attribute: 'clinVarClinicalSignificance',     map: this.getTranslator().clinvarMap },
        {name:'Pathogenicity - PolyPhen'     , id:'polyphen',       order:2, index:6,   match: 'exact', attribute: 'vepPolyPhen', map: this.getTranslator().polyphenMap},
        {name:'Pathogenicity - SIFT'         , id:'sift',           order:3, index:7,   match: 'exact', attribute: 'vepSIFT',     map: this.getTranslator().siftMap},
        {name:'Impact (VEP)'                 , id:'impact',         order:4, index:0,   match: 'exact', attribute: IMPACT_FIELD_TO_COLOR,   map: this.getTranslator().impactMap},
        {name:'Most severe impact (VEP)'     , id:'highest-impact', order:5, index:1,   match: 'exact', attribute: IMPACT_FIELD_TO_FILTER,  map: this.getTranslator().highestImpactMap},
        {name:'Bookmark'                     , id:'bookmark',       order:6, index:10,  match: 'exact', attribute: 'isBookmark',     map: this.getTranslator().bookmarkMap },
        {name:'Inheritance Mode'             , id:'inheritance',    order:7, index:3,   match: 'exact', attribute: 'inheritance', map: this.getTranslator().inheritanceMap},
        {name:'Present in Affected'          , id:'affected',       order:8, index:8,   match: 'exact', attribute: 'affected_summary',  map: this.getTranslator().affectedMap},
        {name:'Absent in Unaffected'         , id:'unaffected',     order:9, index:9,   match: 'exact', attribute: 'unaffected_summary',  map: this.getTranslator().unaffectedMap},
        {name:'Allele Frequency <5%'         , id:'af-highest',     order:10, index:11, match: 'range', attribute: 'afHighest',      map: this.getTranslator().afHighestMap},
        {name:'Zygosity'                     , id:'zygosity',       order:11, index:4, match: 'exact', attribute: 'zygosity',      map: this.getTranslator().zygosityMap},
        {name:'Genotype'                     , id:'genotype',       order:12, index:5, match: 'field', attribute: 'eduGenotypeReversed' }
      ];

      this.matrixRowsBasic = [
        {name:'Pathogenicity - ClinVar',id:'clinvar',         order:0,  index:0,  match:  'field', height: 33, attribute: 'clinVarClinicalSignificance', formatFunction: this.formatClinvar, clickFunction: this.clickClinvar,  rankFunction: this.getClinvarRank  },
        {name:'Inheritance Mode'       ,id:'inheritance',     order:1,  index:1,  match:  'field', height: 21, attribute: 'inheritance',                 formatFunction: this.formatInheritance},
        {name:'Transcript'             ,id:'transcript',      order:2,  index:2,  match:  'field', height: 21, attribute: 'start',                       formatFunction: this.formatCanonicalTranscript},
        {name:'cDNA'                   ,id:'cdna',            order:3,  index:3,  match:  'field', height: 31, attribute: 'vepHGVSc',                    formatFunction: this.formatHgvsC    },
        {name:'Protein'                ,id:'protien',         order:4,  index:4,  match:  'field', height: 21, attribute: 'vepHGVSp',                    formatFunction: this.formatHgvsP    },
        {name:'Chr'                    ,id:'chr',             order:5,  index:5,  match:  'field', height: 21, attribute: 'chrom',                       },
        {name:'Position'               ,id:'position',        order:6,  index:6,  match:  'field', height: 21, attribute: 'start',                       },
        {name:'Ref'                    ,id:'ref',             order:7,  index:7,  match:  'field', height: 21, attribute: 'ref',                         },
        {name:'Alt'                    ,id:'alt',             order:8,  index:8,  match:  'field', height: 21, attribute: 'alt'                          },
        {name:'Mutation Freq 1000G'    ,id:'af-1000g',        order:9,  index:9,  match:  'field', height: 21, attribute: 'af1000G',                     formatFunction: this.formatAlleleFrequencyPercentage },
        {name:'Mutation Freq gnomAD'   ,id:'af-gnomAD',       order:10, index:10,  match: 'field', height: 21, attribute: 'afgnomAD',                    formatFunction: this.formatAlleleFrequencyPercentage }
      ];
      this.filteredMatrixRows = this.matrixRows;
      this.featureUnknown = 199;

  }

  init() {
    let self = this;

    if (isLevelBasic) {
      this.matrixRows = this.matrixRowsBasic;
    } else if (isLevelEdu || isLevelBasic) {
      this.removeRow('Pathogenicity - SIFT', self.matrixRows);

      this.removeRow('Zygosity', self.matrixRows);
      this.removeRow('Bookmark', self.matrixRows);

      // Only show genotype on second educational tour or level basic
      if (!isLevelEdu || eduTourNumber != 2) {
        this.removeRow('Genotype', self.matrixRows);
      }
      // Only show inheritance on first educational tour or level basic
      if (!isLevelEdu || eduTourNumber != 1) {
        this.removeRow('Inheritance Mode', self.matrixRows);
      }
      this.removeRow('Most severe impact (VEP)', self.matrixRows);
      this.removeRow('Present in Affected', self.matrixRows);
      this.removeRow('Absent in Unaffected', self.matrixRows);
      this.removeRow('Allele Frequency - 1000G', self.matrixRows);
      this.removeRow('Allele Frequency - ExAC', self.matrixRows);

      this.setRowLabel('Impact - SnpEff',             'Severity');
      this.setRowLabel('Impact - VEP',                'Severity');
      this.setRowLabel('Pathogenicity - ClinVar',     'Known from research');
      this.setRowLabel('Pathogenicity - PolyPhen',    'Predicted effect');
      this.setRowLabel('Inheritance Mode',            'Inheritance');
    } else {
      this.removeRow('Genotype', self.matrixRows);
    }

  }

  getProgressText() {
    if (this.inProgress.loadingVariants) {
      return "Annotation variants";
    } else if (this.inProgress.rankingVariants) {
      return "Ranking variants";
    } else {
      return "";
    }
  }



  removeRow(searchTerm, theMatrixRows) {
    var idx = theMatrixRows.findIndex(function(row) {
      return row.name === searchTerm;
    });

    if (idx >= 0) {
      var removedOrder = theMatrixRows[idx].order;
      theMatrixRows.splice(idx, 1);
      theMatrixRows.forEach(function(row) {
        if (+row.order > +removedOrder) {
          row.order--;
        }
      });
    }
  }

  setRowLabel(searchTerm, newRowLabel) {
    this.matrixRows.forEach( function (row) {
      if (row.name.indexOf(searchTerm) >= 0) {
        row.name = newRowLabel;
      }
    });
    if (this.filteredMatrixRows) {
      this.filteredMatrixRows.forEach( function (row) {
        if (row.name.indexOf(searchTerm) >= 0) {
          row.name = newRowLabel;
        }
      });
    }

  }

  setRowLabelById(id, newRowLabel) {
    this.matrixRows.forEach( function (row) {
      if (row.id == id) {
        row.name = newRowLabel;
      }
    });
    if (this.filteredMatrixRows) {
      this.filteredMatrixRows.forEach( function (row) {
        if (row.id == id) {
          row.name = newRowLabel;
        }
      });
    }

  }

  setRowAttributeById(id, newRowAttribute) {
    this.matrixRows.forEach( function (row) {
      if (row.id == id) {
        row.attribute = newRowAttribute;
      }
    });
    if (this.filteredMatrixRows) {
      this.filteredMatrixRows.forEach( function (row) {
        if (row.id == id) {
          row.attribute = newRowAttribute;
        }
      });
    }

  }

  getRowAttribute(searchTerm) {
    var attribute = "";
    this.matrixRows.forEach( function (row) {
      if (row.name.indexOf(searchTerm) >= 0) {
        attribute = row.attribute;
      }
    });
    return attribute;
  }

  getRowOrder(searchTerm) {
    var order = "";
    this.matrixRows.forEach( function (row) {
      if (row.name.indexOf(searchTerm) >= 0) {
        order = row.order;
      }
    });
    return order;
  }


  getCellHeights() {
    return isLevelBasic ? this.matrixRowsBasic.map(function(d){return d.height}) : null;
  }

  getTranslator() {
    return this.cohort.translator;
  }

  getAffectedInfo() {
    return this.cohort.affectedInfo;
  }

  getGenericAnnotation() {
    return this.cohort.genericAnnotation;
  }

  clearRankedVariants() {
    this.rankedVariants = [];
  }

  setRankedVariants(regionStart, regionEnd) {
    if (this.featureVcfData) {
      if (regionStart && regionEnd) {
        this.rankedVariants = this.featureVcfData.features.filter(function(feature) {
          return feature.start >= regionStart && feature.start <= regionEnd;
        })
      } else {
        this.rankedVariants = this.featureVcfData.features;
      }
    }

  }


  promiseRankVariants(theVcfData) {
    let self = this;
    self.featureVcfData = theVcfData;
    self.inProgress.rankingVariants = true;

    return new Promise(function(resolve, reject) {

      var unfilteredVcfData = theVcfData;

      if (theVcfData == null) {
        resolve();
      } else {

        // Figure out if we should show the unaffected sibs row
        if (self.filteredMatrixRows == null) {
          self.filteredMatrixRows = $.extend(true, [], self.matrixRows);
          var affectedInfo = self.getAffectedInfo();
          var affected = affectedInfo.filter(function(info) {
            return info.status == 'affected' && info.relationship != 'proband';
          })
          var unaffected = affectedInfo.filter(function(info) {
            return info.status == 'unaffected' && info.relationship != 'proband';
          })
          if (affected.length == 0) {
            self.removeRow('Present in Affected', self.filteredMatrixRows);
          }
          if (unaffected.length == 0) {
            self.removeRow('Absent in Unaffected', self.filteredMatrixRows);
          }

          // Figure out if we should show any rows for generic annotations
          var genericMatrixRows = self.getGenericAnnotation().getMatrixRows(theVcfData.genericAnnotators);

          genericMatrixRows.forEach(function(matrixRow) {
            matrixRow.index = self.filteredMatrixRows.length;
            matrixRow.order = self.filteredMatrixRows.length;
            self.filteredMatrixRows.push(matrixRow);
          })
        }

        if (theVcfData != null) {
          self.featureVcfData = {};
          self.featureVcfData.features = [];
          theVcfData.features.forEach(function(variant) {
            self.featureVcfData.features.push($.extend({}, variant));
          });
        }

        // Sort the matrix columns
        self.filteredMatrixRows = self.filteredMatrixRows.sort(function(a, b) {
          if (a.order == b.order) {
            return 0;
          } else if (a.order < b.order) {
            return -1;
          } else {
            return 1;
          }
        });

        // Fill all features used in feature matrix for each variant
        self.featureVcfData.features.forEach( function(variant) {
          var features = [];
          for (var i = 0; i < self.filteredMatrixRows.length; i++) {
            features.push(null);
          }

          self.filteredMatrixRows.forEach( function(matrixRow) {
            var rawValue = null;
            if (matrixRow.attribute instanceof Array) {
              rawValue = self.getGenericAnnotation().getValue(variant, matrixRow.attribute);
            } else {
              rawValue = variant[matrixRow.attribute];
            }
            var theValue    = null;
            var mappedValue = null;
            var mappedClazz = null;
            var symbolFunction = null;
            var bindTo = null;
            var clickFunction = matrixRow.clickFunction;
            // Don't fill in clinvar for now
            if (matrixRow.attribute == 'clinvar') {
              rawValue = 'N';
            }
            if (rawValue != null && (self.isNumeric(rawValue) || rawValue != "")) {
              if (matrixRow.match == 'field') {
                if (matrixRow.formatFunction) {
                  theValue = matrixRow.formatFunction.call(me, variant, rawValue);
                } else {
                  theValue = rawValue;
                }
                mappedClazz = matrixRow.attribute;
                if (matrixRow.rankFunction) {
                  mappedValue = matrixRow.rankFunction.call(me, variant, rawValue);
                } else {
                  mappedValue = theValue;
                }
                symbolFunction = matrixRow.symbolFunction ? matrixRow.symbolFunction : self.showTextSymbol;
                bindTo = matrixRow.bind ? matrixRow.bind : null;

              } else if (matrixRow.match == 'exact') {
                // We are going to get the mapped value through exact match,
                // so this will involve a simple associative array lookup.
                // Some features (like impact) are multi-value and are stored in a
                // an associative array.  In this case, we loop through the feature
                // values, keeping the lowest (more important) mapped value.
                if (self.isDictionary(rawValue)) {
                  // Iterate through the objects in the associative array.
                  // Keep the lowest mapped value
                  if (Object.keys(rawValue).length > 0) {
                    for (var val in rawValue) {
                      var entry = matrixRow.map[val];
                      if (entry != null && entry.symbolFunction && (mappedValue == null || entry.value < mappedValue)) {
                        mappedValue = entry.value;
                        mappedClazz = entry.clazz;
                        symbolFunction = entry.symbolFunction;
                        bindTo = entry.bind ? entry.bind : null;
                        theValue = val;
                      }
                    }
                  } else {
                    var entry = matrixRow.map.none;
                    if (entry != null && entry.symbolFunction && (mappedValue == null || entry.value < mappedValue)) {
                      mappedValue = entry.value;
                      mappedClazz = entry.clazz;
                      symbolFunction = entry.symbolFunction;
                      bindTo = entry.bind ? entry.bind : null;

                      theValue = '';
                    }
                  }
                } else {
                  if (matrixRow.map.hasOwnProperty(rawValue)) {
                    mappedValue = matrixRow.map[rawValue].value;
                    mappedClazz = matrixRow.map[rawValue].clazz;
                    symbolFunction = matrixRow.map[rawValue].symbolFunction;
                    bindTo = matrixRow.map[rawValue].bind ? matrixRow.map[rawValue].bind : null;
                    theValue = rawValue;
                  } else {
                    console.log("No matrix value to map to " + rawValue + " for " + matrixRow.attribute);
                  }

                }
              } else if (matrixRow.match == 'range') {
                // If this feature is a range, get the mapped value be testing if the
                // value is within a min-max range.
                if (self.isNumeric(rawValue)) {
                  theValue = d3.format(",.3%")(+rawValue);
                  var lowestValue = 9999;
                  matrixRow.map.forEach( function(rangeEntry) {
                    if (+rawValue > rangeEntry.min && +rawValue <= rangeEntry.max) {
                      if (rangeEntry.value < lowestValue) {
                        lowestValue = rangeEntry.value;
                        mappedValue = rangeEntry.value;
                        mappedClazz = rangeEntry.clazz;
                        symbolFunction = rangeEntry.symbolFunction;
                        bindTo = rangeEntry.bind ? rangeEntry.bind : null;
                      }
                    }
                  });
                }
              }

            } else {
              rawValue = '';
              mappedClazz = '';
            }
            features[matrixRow.order] = {
                                  'value': theValue,
                                  'rank': (mappedValue ? mappedValue : self.featureUnknown),
                                  'clazz': mappedClazz,
                                  'symbolFunction': symbolFunction,
                                  'bindTo': bindTo,
                                  'clickFunction': clickFunction
                                };
          });

          variant.features = features;
        });
        // Sort the variants by the criteria that matches
        self.rankedVariants = self.featureVcfData.features.sort(function (a, b) {
          var featuresA = "";
          var featuresB = "";

          // The features have been initialized in the same order as
          // the matrix column order. In each interation,
          // exit with -1 or 1 if we have non-matching values;
          // otherwise, go to next iteration.  After iterating
          // through every column, if we haven't exited the
          // loop, that means all features of a and b match
          // so return 0;
          for (var i = 0; i < self.filteredMatrixRows.length; i++) {
            if (a.features[i] == null) {
              return 1;
            } else if (b.features[i] == null) {
              return -1;
            } else if (a.features[i].rank > 99  && b.features[i].rank > 99) {
              // In this case, we don't consider the rank and will look at the next feature for ordering
            } else if (a.features[i].rank > 99) {
              return 1;
            } else if (b.features[i].rank > 99) {
              return -1;
            } else if (a.features[i].rank < b.features[i].rank) {
              return -1;
            } else if (a.features[i].rank > b.features[i].rank) {
            return 1;
          } else {
          }
          }
          return 0;
        });

        if (self.rankedVariants.length == 0) {
          self.warning = "0 variants";
        } else {
          self.warning = "";
        }

        self.inProgress.rankingVariants = false;

        resolve();

      }
    })


  }

  isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  isDictionary(obj) {
    if(!obj) {
      return false;
    }
    if(Array.isArray(obj)) {
      return false;
    }
    if (obj.constructor != Object) {
      return false;
    }
    return true;
  }

  formatClinvar(variant, clinvarSig) {
    var display = "";
    for (key in clinvarSig) {
      if (key == "none" || key == "not_provided") {

      } else {
        // Highlight the column as 'danger' if variant is considered pathogenic or likely pathogenic
        if (isLevelBasic) {
          if (key.indexOf("pathogenic") >= 0) {
            if (variant.featureClass == null) {
              variant.featureClass = "";
            }
            variant.featureClass += " danger";
          }
        }
        if (display.length > 0) {
          display += ",";
        }
        display += key.split("_").join(' ');
      }
    }
    return display;
  }


  formatAlleleFrequencyPercentage(variant, value) {
    return value && value != "" && +value >= 0 ? utility.round(+value * 100, 2) + "%" : "";
  }

  formatCanonicalTranscript(variant, value) {
    return utility.stripTranscriptPrefix(selectedTranscript.transcript_id);
  }

  formatHgvsP(variant, value) {
    if (value == null || value == '' || Object.keys(value).length == 0) {
      return "";
    } else {
      var buf = "";
      for(var key in value) {
        var tokens = key.split(":p.");
        if (buf.length > 0) {
          buf += " ";
        }
        if (tokens.length == 2) {
          var basicNotation = "p." + tokens[1];
          buf += basicNotation;
        } else if (tokens.length == 1 && utility.endsWith(tokens[0],"(p.=)")) {
          // If synoymous variants, show p.(=) in cell
          if (variant.vepConsequence && Object.keys(variant.vepConsequence).length > 0) {
            for( consequence in variant.vepConsequence) {
              if (consequence == "synonymous_variant") {
                buf += "p.(=)";
              }
            }
          }
        }
      }
      return buf;
    }
  }

  formatHgvsC(variant, value) {
    if (value == null || value == '' || Object.keys(value).length == 0) {
      return "";
    } else {
      var buf = "";
      for(var key in value) {
        var tokens = key.split(":c.");
        if (buf.length > 0) {
          buf += " ";
        }
        if (tokens.length == 2) {
          var basicNotation = "c." + tokens[1];
          buf += basicNotation;
        }
      }
      return buf;
    }

  }

  formatAfHighest(variant, afField) {
    return afField && afField.length > 0 && +variant[afField] < .1 ? utility.percentage(variant[afField], false) : "";
  }

  formatInheritance(variant, value) {
    return this.getInheritanceLabel(value);
  }

  getInheritanceLabel(inheritance) {
    var matrixRow = this.inheritanceMap[inheritance];
    return matrixRow ? matrixRow.display : inheritance;
  }


}

export default FeatureMatrixModel;