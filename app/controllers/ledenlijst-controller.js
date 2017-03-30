(function () {
  'use strict';

  angular
    .module('ga.ledenlijstcontroller', [])
    .controller('LedenlijstController', LedenlijstController);

  LedenlijstController.$inject = ['$log', '$scope', 'LedenFilterService', 'RestService', '$window', 'keycloak'];

  function LedenlijstController($log, $scope, LFS, RestService, $window, keycloak) {
    // Kolommen sortable maken
    var index;
    $( ".sortable" ).sortable({
      placeholder: "placeholder-kolom-kop",
      helper: "clone",
      start : function(event, ui){
        index =  ui.item.index();
      },
      stop : function(event, ui){
        $(".placeholder-body").remove();
        // To-Do filter aanpassen
        // To-Do Leden wissen
        // TO-Do nieuwe leden ophalen
        console.log(ui.item.index());
      },
      change : function(){
        $( "table tbody tr td:nth-child(" + (index + 1) + ")" ).hide();
        $(".placeholder-body").remove();
        $("table tbody tr td:nth-child(" + $('.placeholder-kolom-kop').index() + ")" ).after('<td class="placeholder-body" style="background-color: #A9C593;"></td>');
      }
    });

    /*
     * Filter samenstellen
     * -------------------------------------------------------
     */

    stelFilterSamen();

    function stelFilterSamen(id){
      // if there is no id provided, we'll go with the id 'huidige'
      var filterId = id ? id : 'huidige';

      $scope.criteria = [];

      // functies ophalen
      RestService.Functies.get().$promise.then(
        function(result){
          var functies = result.functies;
          var functieGroepen = [];

          // functieGroep maken van functies met type 'verbond'
          var functieGroepVerbond = LFS.maakFunctieGroepVerbond(functies);
          // functieGroepen maken van functies met type 'groep'
          var groepSpecifiekeFunctieGroepen = LFS.maakGroepSpecifiekeFunctieGroepen(functies);

          var functieGroepen = [];
          functieGroepen.push(functieGroepVerbond);
          _.each(groepSpecifiekeFunctieGroepen,function(value,key){
            functieGroepen.push(value);
          });

          // aangemaakte functieGroepen toevoegen aan de criteria.
          _.each(functieGroepen, function(value){
            $scope.criteria.push(value);
          });

        });

      // groepen ophalen
      RestService.Groepen.get().$promise.then(
        function(result){
          //$log.debug("------ get groepen", result.groepen);
          var groepen = result.groepen;
          var groepenCriteria = {
                          title : "Groepen",
                          criteriaKey : "groepen",
                          multiplePossible : true,
                          items: []
                          };
          angular.forEach(groepen, function(value){
            var groep = {
                      value : value.groepsnummer,
                      label : value.naam + " [" + value.groepsnummer + "]"
            }
            groepenCriteria.items.push(groep);
          });
          $scope.criteria.push(groepenCriteria);
        });

      // groepseigenfuncties ophalen

      // filters ophalen
      RestService.Filters.get().$promise.then(
        function (result){
          $scope.filters = result.filters;
        }
      )

      // statische criteria toevoegen.
      var geslacht = LFS.getCriteriaGeslacht();
      $scope.criteria.push(geslacht);

      var geblokeerdAdres = LFS.getCriteriaGeblokkeerdAdres();
      $scope.criteria.push(geblokeerdAdres);

      var oudleden = LFS.getCriteriaOudleden();
      $scope.criteria.push(oudleden);



      // huidige filter ophalen en verwerken;
      RestService.FilterDetails.get({id: filterId}).$promise.then(
        function (response) {
          //$log.debug('FilterDetails', filterId, response);
          $scope.geselecteerdeCriteria = [];
          $scope.currentFilter = response;
          //$log.debug('filter-----',filterId , 'filterDetails response----', $scope.currentFilter);

          angular.forEach($scope.currentFilter.criteria, function(value, key){
            if(key === "functies") {
              RestService.Functies.get().$promise.then(
                function (response) {
                  //$log.debug("Functies---", response);
                  angular.forEach(value, function(functieID) {
                    angular.forEach(response.functies, function(apiFunctie) {
                      if (apiFunctie.id == functieID) {
                        if(!LFS.bestaatFunctieGroep(apiFunctie, $scope.geselecteerdeCriteria)){
                          $scope.geselecteerdeCriteria = LFS.voegFunctieGroepToeAan(apiFunctie, $scope.geselecteerdeCriteria);
                        }
                        $scope.geselecteerdeCriteria = LFS.voegItemToeAanFunctieGroep(apiFunctie, $scope.geselecteerdeCriteria);
                      }
                    });
                  });
                }
              );
            } else if(key === "groepen") {
                var items = [];
                angular.forEach(value, function(groepsnummer){
                  RestService.Groep.get({id:groepsnummer}).$promise.then(
                    function(result){
                      var groep  = result;
                     items.push({
                          value : groep.groepsnummer,
                          label :  groep.naam + " [" + groep.groepsnummer + "]"
                        });
                    }
                  );
                });
                var tempselectedCriteria = {
                  title : key.charAt(0).toUpperCase() + key.slice(1),
                  criteriaKey : "groepen",
                  multiplePossible : true,
                  items: items
                }
                $scope.geselecteerdeCriteria.push(tempselectedCriteria);

            } else {
                var tempselectedCriteria = {
                  title : key.charAt(0).toUpperCase() + key.slice(1),
                  items : value
                }
                $scope.geselecteerdeCriteria.push(tempselectedCriteria);
            }
          });
        }
      );
    }

    // returnt de key/index van een criteria a.d.h.v. de titel
    $scope.getKeyInCriteriaBytitle = function(title){
      var criteriaKey;
      angular.forEach($scope.criteria, function(value, key){
        if(value.title == title){
          criteriaKey =  key;
          return
        }
      })
      return criteriaKey;
    }

    // controle is de criteria geselecteerd a.d.h.v. de titel
    $scope.inSelectedCriteria = function(title){
      var criteriaKey;
      angular.forEach($scope.geselecteerdeCriteria, function(value, key){
        if(value.title == title){
          criteriaKey =  key;
          return
        }
      })
      if(criteriaKey >= 0 ){
        return true;
      }
      return false;
    }

    // criteria  toevoegen aan de geselecteerde criteria
    $scope.addSelectedCriteria =function(criteriaItem){
      $scope.geselecteerdeCriteria.push({
                                        title : criteriaItem.title,
                                        creteriaKey : criteriaItem.creteriaKey,
                                        multiplePossible : criteriaItem.multiplePossible,
                                        items : []
                                        });
    }

    // criteria  wissen uit de geselecteerde criteria
    $scope.closeCriteria = function(selectedCriteria){
      var criteriaKey;
      angular.forEach($scope.geselecteerdeCriteria, function(value, key){
        if(value.title == selectedCriteria.title){
          criteriaKey =  key;
          return;
        }
      })
      $scope.geselecteerdeCriteria.splice(criteriaKey,1);

      //TO-DO: delete from filtermodel
      //TO-DO: nieuwe leden ophalen
    }


    // controle is het criteriaitem geselecteerd
    $scope.isCriteriaItemSelected= function(criteriaItem, selectedCriteria){
      var itemsLength = selectedCriteria.items.length
      for(var i = 0; i < itemsLength; i++){
        if(selectedCriteria.items[i].value == criteriaItem.value){
          return true;
        }
      }
      return false;

    }

    // label
    $scope.getLabelForValue = function(value, selectedCriteria){
      var label = '';
      angular.forEach($scope.criteria, function(criteria){
        if(criteria.title == selectedCriteria.title){
          angular.forEach(criteria.items, function(item){
            if(item.value == value){
              label = item.label;
              return
            }
          });
          return
        }
      });
      return label;
    }

    // kolomen ophalen;
    RestService.Kolomen.get({}).$promise.then(
      function(result){
        $scope.kolommen = result.kolommen;
      }
    );

    $scope.kolomInFilter = function(kolom){
      var returnVal = false;
      angular.forEach($scope.currentFilter.kolommen, function(val){
        if(val.id == kolom.id){
          returnVal = true;
        }
      })
      return returnVal;
    }
    $scope.changeKolomInFilter = function(kolom){
      // controle zit kolom reeds in filter => wis
      var kolomInFilterIndex;
      angular.forEach($scope.currentFilter.kolommen, function(value, key){
        if(value.id == kolom.id){
          kolomInFilterIndex = key;
        }
      });
      if(kolomInFilterIndex){
        //wis de kolom
        $scope.currentFilter.kolommen.splice(kolomInFilterIndex, 1);
        // huidige filter aanpasen via API
      }
      else {
        // voeg de kolom toe
        $scope.currentFilter.kolommen.push(kolom);
        // huidige filter aanpasen via API
      }

      // kolom nog niet in de filer => voeg toe

    }

    /*
     * Filter samenstellen
     * -------------------------------------------------------
     */

    $scope.setFilter = function(filter){
      stelFilterSamen(filter.id)
      // resultaat wissen,

    }

    /*
     * Filter aanpassen
     * -------------------------------------------------------
     */
    // item toevoegen aan een criteria waar er meerdere items geselecteerd mogen worden.
    $scope.filterCriteriaToevoegen = function(criteriaItem, selectedCriteria){
      selectedCriteria.items.push(criteriaItem);

      //TO-DO: toevoegenen aan filtermodel
      //TO-DO: nieuwe leden ophalen
    }

    // item verwijderen uit een criteria waar er meerdere items geselecteerd mogen worden.
    $scope.filterCriteriaVerwijderen = function(criteriaItem, selectedCriteria){
      // verwijderen uit geselecteerdeCriteria
      var itemsLength = selectedCriteria.items.length
      for(var i = 0; i < itemsLength; i++){
        if(selectedCriteria.items[i].value == criteriaItem.value){
           selectedCriteria.items.splice(i, 1);
           break;
        }
      }

      //TO-DO: toevoegenen aan filtermodel
      //TO-DO: nieuwe leden ophalen
    }

    // nieuwe waarde voor een criteria waarvan maar één item geselecteerd magworden aanpassen
    $scope.filterCriteriaAanpassen = function(criteriaItem, selectedCriteria){
      selectedCriteria.items = criteriaItem.value;
    }

    /*
     * Infinity scroll
     * -----------------------------------------------------------
     */
    $scope.busy = false;
    $scope.end = false;
    $scope.aantalPerPagina = 10;
    $scope.leden = [];

    // controle moet er meer leden ingeladen worden
    $scope.meerLaden = function(last){
      if(last && $(window).height() > $("#leden").height()){
        $scope.nextPage();
      }
    }


    // functie die aangeroepen word om (meer) leden op te halen via de api
    $scope.nextPage = function(){
      if ($scope.busy) return;
      $scope.busy = true;
      // voorkom dat er request gedaanworden wanneer alle resultaaten geladen zijn
      if($scope.leden.length !== $scope.totaalAantalLeden){
        RestService.Leden.get({aantal: $scope.aantalPerPagina, offset: ($scope.leden.length == 0) ? 0 : ($scope.leden.length) }).$promise.then(
          function (response) {
            // voeg de leden toe aan de leden Array;
            $scope.leden.push.apply($scope.leden,response.leden);
            $scope.totaalAantalLeden = response.totaal;
            $scope.offset = response.offset;
            $scope.busy = false;
          },
          function (error) {
          }
        );
      }
      else{
        $scope.busy = false;
        $scope.end = true;
      }
    }

    // controle on resize
    angular.element($window).bind('resize', function () {
      if($(window).height() > $("#leden").height() && !$scope.busy){
        $scope.nextPage();
      }
    });

    /*
     * Sortering
     * ------------------------------------------------------------------
     */

    // controle voor de sortering
    // returnt het nummer volgens de volgorde van de sortering als de kolom in de sortering zit en
    // wanner de volgorde die meegegeven is overeenkomt met de volgorde in de sortering.

    $scope.sortering = function(kolomId, volgorde){
      var returnValue = false;
      angular.forEach($scope.currentFilter.sortering, function(value,key){
        if(value.kolom == kolomId && value.oplopend == volgorde){
          switch(key){
            case 0:
                returnValue = 1;
                break;
              case 1:
                returnValue = 2;
                break;
              case 2:
                returnValue = 3;
                break;
          }
        }
      });
      return returnValue;
    }

    // uitvoeren van van een sortering.
    $scope.addSort = function(kolomId, volgorde){
      var originalSort = $scope.currentFilter.sortering;
      //$log.debug("originalSort --- ",originalSort);

      // controle werd er geclicked op een sort die reeds in de sortering zit => delete from sortering
      var deleteFromSort = false;
      angular.forEach(originalSort, function(value){
        if(value.kolom == kolomId && value.oplopend == volgorde){
          deleteFromSort = true;
          return;
        }
      });

      // nieuwe sortering toevoegen aan de set
      if(!deleteFromSort){
        $scope.currentFilter.sortering = []
        $scope.currentFilter.sortering[0] = {
          kolom : kolomId,
          oplopend : volgorde
        };
      } else{
        $scope.currentFilter.sortering = []
      }


      // laatste 2 van de oude sort toevoegen
      // controle zat de nieuwe al in de sortering?
      angular.forEach(originalSort, function(value){
        if($scope.currentFilter.sortering.length == 3){
          return;
        }
        if(value.kolom != kolomId){
          $scope.currentFilter.sortering[$scope.currentFilter.sortering.length] = value;
        }

      });

      // leden herladen of als ze allemaal gelanden zijn lokaal filteren.
        // indien herladen moet worden éérst filter opslaan
          //controle is de huidige filter een opgeslagen filter ?
           // ja nieuwe filter maken van huidige filter.
      if($scope.totaalAantalLeden == $scope.leden.length){
        // lokaal hersorteren.
      }

    }
}

})();
